'use strict';

import { mongoProcessList } from './mongo_process';

async function main(argv: string[]) {
    // let ninjaFile = argv[2];

    console.log("PROCS: " + JSON.stringify(await mongoProcessList()));
    console.log("Done loading processes");

}

main(process.argv);