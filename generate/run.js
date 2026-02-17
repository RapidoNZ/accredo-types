const fs = require("fs");
const { exec } = require("child_process");

const execAsync = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        reject(error);
        return;
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`);
      } else {
        console.log("No errors generating code!");
      }
      resolve();
    });
  });
};

function replaceInvalidTypes(obj) {
  if (obj.type === "int64") {
    obj.type = "number";
  }
  for (let prop in obj) {
    if (typeof obj[prop] === "object") {
      replaceInvalidTypes(obj[prop]);
    }
  }
}

function transformOdataActionParameters(data) {
  const endpointsToTransform = [
    "/ARAllocateTransactions",
    "/APAllocateTransactions",
  ];

  endpointsToTransform.forEach((endpoint) => {
    const pathObj = data.paths[endpoint];
    if (!pathObj) {
      console.log(`Warning: Endpoint ${endpoint} not found in OpenAPI spec`);
      return;
    }

    Object.keys(pathObj).forEach((method) => {
      const operation = pathObj[method];
      console.log(`Transforming endpoint: ${endpoint} ${method}`);

      if (
        operation.parameters &&
        operation.parameters.some((p) => p.in === "query")
      ) {
        const queryParams = operation.parameters.filter((p) => p.in === "query");
        const otherParams = operation.parameters.filter((p) => p.in !== "query");

        const properties = {};
        const required = [];

        queryParams.forEach((param) => {
          properties[param.name] = { type: param.type };
          if (param.required) required.push(param.name);
        });

        const bodyParam = {
          name: "body",
          in: "body",
          required: true,
          schema: { type: "object", properties },
        };

        if (required.length > 0) bodyParam.schema.required = required;

        operation.parameters = [...otherParams, bodyParam];
        console.log(`Transformed ${queryParams.length} query parameters to body for ${endpoint}`);
      } else {
        console.log(`No query parameters found for ${endpoint}`);
      }
    });
  });
}

async function run() {
  const { default: ora } = await import("ora");

  console.log("Reading openapi.json from project root...");
  const data = JSON.parse(fs.readFileSync("../openapi.json", "utf8"));

  const spinner = ora("Processing definitions...").start();

  const definitions = Object.keys(data.definitions);
  definitions.forEach((d) => {
    const definition = data.definitions[d];
    if (definition.type === "object" && d.indexOf("TABLE") < 0) {
      definition.properties["@odata.etag"] = { type: "string" };
    }
    if (definition.type === "object") {
      replaceInvalidTypes(definition);
    }
  });

  for (let path in data.paths) {
    for (let method in data.paths[path]) {
      if (data.paths[path][method].parameters) {
        data.paths[path][method].parameters.forEach((parameter) => {
          replaceInvalidTypes(parameter);
        });
      }
    }
  }

  transformOdataActionParameters(data);

  const responseRefs = new Set();
  Object.values(data.paths).forEach((path) => {
    Object.values(path).forEach((method) => {
      if (method.responses) {
        Object.values(method.responses).forEach((response) => {
          if (response.schema && response.schema.$ref) {
            responseRefs.add(response.schema.$ref.split("/").pop());
          }
        });
      }
    });
  });

  const definitionKeys = Object.keys(data.definitions);
  definitionKeys.forEach((d) => {
    if (responseRefs.has(d)) {
      data.definitions[`Paged${d}`] = {
        type: "object",
        properties: {
          "@odata.deltaLink": { type: "string" },
          "@odata.context": { type: "string" },
          value: { type: "array", items: { $ref: `#/definitions/${d}` } },
        },
      };
    }
  });

  const pathKeys = Object.keys(data.paths);
  pathKeys.forEach((p) => {
    if (!p.includes("(")) {
      const path = data.paths[p];
      if (path.get) {
        const description = path.get.description || "";
        if (!description.includes("ODATA function")) {
          try {
            const originalSchema = path.get.responses["200"].schema.$ref.split("/").pop();
            path.get.responses["200"].schema = { $ref: `#/definitions/Paged${originalSchema}` };
          } catch (error) {
            console.log("no schema", path);
          }
        }
      }
    }
  });

  // Allow custom fields (Z_*) on all object definitions
  Object.keys(data.definitions).forEach((d) => {
    if (data.definitions[d].type === "object") {
      data.definitions[d].additionalProperties = true;
    }
  });

  fs.writeFileSync("./openapiToGenerate.json", JSON.stringify(data, null, 2));

  spinner.text = "Generating models...";
  await execAsync("npm run generate");

  spinner.text = "Copying manual additions...";
  let additionModels = fs.readdirSync("../additions/models");
  additionModels = additionModels.filter((model) => !model.includes(".DS_Store"));
  additionModels.forEach((model) => {
    fs.copyFileSync(`../additions/models/${model}`, `../src/models/${model}`);
  });

  // Inject [key: string]: any into all generated interfaces for Z_* custom field support
  spinner.text = "Injecting custom field support into interfaces...";
  const generatedFiles = fs.readdirSync("../src/models")
    .filter((f) => f.endsWith(".ts") && f !== "index.ts");
  generatedFiles.forEach((file) => {
    const filePath = `../src/models/${file}`;
    let content = fs.readFileSync(filePath, "utf8");
    // Add index signature after every "export interface Foo {" line
    content = content.replace(
      /^(export interface \w+[^{]*\{)$/gm,
      "$1\n    [key: `Z_${string}`]: any;"
    );
    fs.writeFileSync(filePath, content);
  });

  // Build models/index.ts from all .ts files in the directory
  spinner.text = "Building models/index.ts...";
  const modelsIndexPath = "../src/models/index.ts";
  const allModelFiles = fs.readdirSync("../src/models")
    .filter((f) => f.endsWith(".ts") && f !== "index.ts")
    .map((f) => f.replace(".ts", ""))
    .sort();
  const indexContent = allModelFiles.map((f) => `export * from "./${f}";`).join("\n") + "\n";
  fs.writeFileSync(modelsIndexPath, indexContent);

  // Overwrite src/index.ts with simple re-export
  fs.writeFileSync("../src/index.ts", 'export * from "./models";\n');

  // Clean up generated artifacts
  ["git_push.sh", ".openapi-generator-ignore"].forEach((file) => {
    try { fs.unlinkSync(`../src/${file}`); } catch (e) {}
  });
  try { fs.rmSync("../src/.openapi-generator", { recursive: true, force: true }); } catch (e) {}
  ["package.json", "README.md", ".gitignore", ".npmignore"].forEach((file) => {
    try { fs.unlinkSync(`../src/${file}`); } catch (e) {}
  });

  spinner.succeed("Done! Models generated successfully.");
}

run();
