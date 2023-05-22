'use strict';

const util = require('node:util');
const exec = util.promisify(require('node:child_process').exec);

export interface MongoDProcess {
    pid: number,
    port: number,
    server_type: string,
    replica_set_name: string
}

export interface MongoSProcess {
    pid: number,
    port: number,
    configdb: string,
}


export interface MongoProceses {
    mongod : Array<MongoDProcess>,
    mongos : Array<MongoSProcess>,
    shell : Array<number>,
}

async function mongoProcessPS() : Promise<string> {
    // TODO
    const { stdout, stderr } = await exec('/home/mark/bin/mpf');
    //   console.log('stdout:', stdout);
    //   console.error('stderr:', stderr);

    return stdout;
}

export async function mongoProcessList() : Promise<MongoProceses> {
    let output = await mongoProcessPS();

    let obj = JSON.parse(output);
    let struct : MongoProceses = obj;
    return struct;
}