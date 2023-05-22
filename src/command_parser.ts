'use strict';
import { spawn } from 'node:child_process';
// import { ReadableStream , WritableStream} from "memory-streams";
// import { MemoryStream}  from "memorystream";
import MemoryStream = require("memorystream")
import * as readline from 'readline';

/**
 * Interface to parse commands that are being run
 */
export interface CommandOutputParser {

  handleLine(line : string ) : void;
}

export function runCommand(command : string, args : string[], parser: CommandOutputParser): Promise<string> {

        // function runCommand(CommandOutputParser parser) {

  return new Promise<string>((resolve, reject) => {

    const ls = spawn(command, args);

    let ms = new MemoryStream();

    let rl = readline.createInterface({input: ms});




    ls.stdout.on('data', (data) => {
    //   console.log(`stdout: ${data}`);
    ms.write(data);
    });

    ls.stderr.on('data', (data) => {
    //   console.error(`stderr: ${data}`);
    ms.write(data);

    });

    ls.on('close', (code) => {
      console.log(`child process exited with code ${code}`);

      ms.end();
      console.log("Process Done");
    });


    rl.on('line', (line) => {
        parser.handleLine(line);
    });

    rl.on('close', () => {
      console.log("Readline Done");

      resolve("Readline Done");

    });
  });
}