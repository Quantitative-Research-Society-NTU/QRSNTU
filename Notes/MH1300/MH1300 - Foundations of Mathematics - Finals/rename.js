// bulk-rename.js
const fs = require("fs");
const path = require("path");

const folder = "./"; // change if needed
const oldPrefix = "MH1300_FoundationsofMathematics_Finals";
const newPrefix = "MH1300_Finals";

fs.readdirSync(folder).forEach(file => {
    if (file.startsWith(oldPrefix)) {
        const newName = file.replace(oldPrefix, newPrefix);
        fs.renameSync(
            path.join(folder, file),
            path.join(folder, newName)
        );
        console.log(`Renamed: ${file} → ${newName}`);
    }
});
