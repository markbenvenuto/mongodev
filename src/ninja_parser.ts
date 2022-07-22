import * as readline from 'readline';
import * as fs from 'fs';

// There are two types of ninja file generators
//
// Original Ninja Module:
// ----------------------
// There are two types of lines to match
// build +db_unittest_test-server_rewrite_test: EXEC build/install/bin/db_unittest_test
// build +server_rewrite_test: phony +db_unittest_test-server_rewrite_test
//
// New Ninja Module:
// ----------------------
//
// build +db_unittest_test-fle_crud_test: CMD build/debug/install/bin/db_unittest_test | $
// build +fle_crud_test: phony | +db_unittest_test-fle_crud_test || generated-sources

// Original Module Parsing
const orig_parse_ninja_exec = new RegExp(/^build \+([\w\.-]+):\s+EXEC\s+([\w\/\\\.]+)/);
const orig_parse_ninja_phony = new RegExp(/^build \+([\w\.-]+):\s+phony\s+\+([\w\/\\\.-]+)/);

// New Module Parsing
const new_parse_ninja_cmd = new RegExp(/^build \+([\w\.-]+):\s+CMD\s+([\w\/\\\.]+)/);
const new_parse_ninja_phony = new RegExp(/^build \+([\w\.-]+):\s+phony\s+\|\s+\+([\w\.\-]+)/);


export function parseNinjaFile(ninjaFile: string): Thenable<Map<string, string>> {

    return new Promise<Map<string, string>>((resolve, reject) => {
        let mapping_exec = new Map<string, string>();
        let mapping_phony = new Map<string, string>();
        // create instance of readline
        // each instance is associated with single input stream
        let rl = readline.createInterface({
            input: fs.createReadStream(ninjaFile)
        });

        let line_no = 0;

        // event is emitted after each line

        let line_complete = false;
        let buffered_line = "";
        let need_line = false;
        rl.on('line', function (line) {
            line_no++;
            if (line.startsWith("build +")) {
                // console.log(line);
                buffered_line = line;
                if (line.endsWith("$")) {
                    need_line = true;
                    line_complete = false;
                } else {
                    need_line = false;
                    line_complete = true;
                }

            }

            if (need_line) {
                buffered_line += line;
                if (line.endsWith("$")) {
                    need_line = true;
                } else {
                    need_line = false;
                    line_complete = true;
                }

            }

            if (line_complete) {
                line_complete = false;
                buffered_line = buffered_line.replace("$", "");

                // Original Module parsing
                let m = orig_parse_ninja_exec.exec(buffered_line);
                if (m !== null) {
                    let test_name_file = m[1];
                    let test_name_exec = m[2];
                    // console.log(`${test_name_exec} -- ${test_name_file}`);
                    mapping_exec.set(test_name_file, test_name_exec);
                    return;
                }

                m = orig_parse_ninja_phony.exec(buffered_line);
                if (m !== null) {
                    let test_name_file = m[1];
                    let test_name_exec = m[2];
                    // console.log(`${test_name_exec} -- ${test_name_file}`);
                    mapping_phony.set(test_name_file, test_name_exec);
                }

                // New Module parsing
                m = new_parse_ninja_cmd.exec(buffered_line);
                if (m !== null) {
                    let test_name_file = m[1];
                    let test_name_exec = m[2];
                    // console.log(`${test_name_exec} -- ${test_name_file}`);
                    mapping_exec.set(test_name_file, test_name_exec);
                    return;
                }

                m = new_parse_ninja_phony.exec(buffered_line);
                if (m !== null) {
                    let test_name_file = m[1];
                    let test_name_exec = m[2];
                    // console.log(`${test_name_exec} -- ${test_name_file}`);
                    mapping_phony.set(test_name_file, test_name_exec);
                }
            }
        });

        // end
        rl.on('close', function () {
            // console.log('Total lines : ' + line_no);
            let mapping_flat = new Map<string, string>();

            mapping_phony.forEach((value, key) => {
                // console.log("Foo:"  + value);
                mapping_flat.set(key, mapping_exec.get(value) ?? "unknown");
            });

            // console.log(mapping_flat);

            resolve(mapping_flat);
        });
    });
}

/*
let ninjaFile = "/home/mark/mongo/linux-clang-local.ninja";
parseNinjaFile(ninjaFile).then((x) => {
    console.log(x);
    console.log("Done loading ninja file");
});
*/

// async function main() {
// let ninjaFile = "/home/mark/mongo/linux-clang-local.ninja";
// let x= await parseNinjaFile(ninjaFile);

//     console.log(x);
//     console.log("Done loading ninja file2");

// }

// main();