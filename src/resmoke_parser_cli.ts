'use strict';

import { parseResmokeCommand } from "./resmoke_parser";

async function main(argv: string[]) {
    let file = argv[2];

    console.log("Reading file: " + file);
    // let x = await runCommand('cat', ['/home/mark/mongo/fle2_sharding_basic_insert_no_mrlog.log'], rp);
    parseResmokeCommand('cat', [file], (e) => { console.log("Process event", e);} ,() => { } );
    // parseResmokeCommand('cat', [file], (e) => { console.log("Process event", e);} ,(l) => {console.log(l);} );

    console.log("Done parsing function");

}

main(process.argv);