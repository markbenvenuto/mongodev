'use strict';
import { parseNinjaFile } from './ninja_parser';


/*
let ninjaFile = "/home/mark/mongo/linux-clang-local.ninja";
parseNinjaFile(ninjaFile).then((x) => {
    console.log(x);
    console.log("Done loading ninja file");
});
*/

async function main(argv: string[]) {
    let ninjaFile = argv[2];
    console.log("Reading file: " + ninjaFile);
    let x = await parseNinjaFile(ninjaFile);

    console.log(x);
    console.log("Done loading ninja file3");

}

main(process.argv);