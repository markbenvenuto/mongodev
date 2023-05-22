'use strict';
import { CommandOutputParser, runCommand } from './command_parser';

/**
 *
Shell launches processes, mrlog processed
js_test:iam_aws_retry] Mock STS Web server is listening on port: 20040
[js_test:iam_aws_retry] 2023-04-28T21:24:58.017Z I  -        [js] shell: Started program {"pid":"3023301","port":-1,"argv":["/usr/bin/pytho
n3","-u","src/mongo/db/modules/enterprise/jstests/external_auth/lib/sts_http_server.py","--port=20040","--fault=fault_500_once"]}
[js_test:iam_aws_retry] 2023-04-28T21:24:59.555Z I  -        [js] shell: Started program {"pid":"3023303","port":20041,"argv":["/home/mark/
mongo/build/install/bin/mongod","--setParameter","awsSTSUrl=http://localhost:20040","--setParameter","authenticationMechanisms=MONGODB-AWS,
SCRAM-SHA-256","--setParameter","disableTransitionFromLatestToLastContinuous=false","--setParameter","requireConfirmInSetFcv=false","--auth
","--port","20041","--bind_ip","0.0.0.0","--dbpath","/data/db/job0/mongorunner/mongod-20041","--setParameter","enableTestCommands=1","--set
Parameter","testingDiagnosticsEnabled=1","--setParameter","disableLogicalSessionCacheRefresh=true","--setParameter","roleGraphInvalidationI
sFatal=true","--storageEngine","wiredTiger","--setParameter","backtraceLogFile=/data/db/job0/mongorunner/dixbcmfy8fpky432bux1s1682717099502
.stacktrace","--setParameter","reshardingMinimumOperationDurationMillis=5000","--setParameter","coordinateCommitReturnImmediatelyAfterPersi
stingDecision=false","--setParameter","oplogApplicationEnforcesSteadyStateConstraints=true","--setParameter","minNumChunksForSessionsCollec
tion=1","--setParameter","transactionLifetimeLimitSeconds=86400","--setParameter","orphanCleanupDelaySecs=1","--setParameter","receiveChunk
WaitForRangeDeleterTimeoutMS=90000","--enableMajorityReadConcern","true","--setParameter","logComponentVerbosity={\"replication\":{\"rollba
ck\":2},\"sharding\":{\"migration\":2,\"rangeDeleter\":2},\"transaction\":4,\"tenantMigration\":4}"]}

Shell launches processes, raw, no mrlog
[js_test:fle2_log_omit] {"t":{"$date":"2023-05-22T18:31:05.202Z"},"s":"I",  "c":"-",        "id":22810,   "ctx":"js","msg":"shell: Started program","attr":{"pid":"2506883","port":20040,"argv":["/home/mark/mongo/build/install/bin/mongod","--oplogSize","40","--port","20040","--dbpath","/data/db/job0/mongorunner/fle2_log_omit-0","--replSet","fle2_log_omit","-v","--setParameter","writePeriodicNoops=false","--setParameter","numInitialSyncConnectAttempts=60","--setParameter","shutdownTimeoutMillisForSignaledShutdown=100","--setParameter","enableDefaultWriteConcernUpdatesForInitiate=true","--setParameter","enableReconfigRollbackCommittedWritesCheck=false","--setParameter","disableTransitionFromLatestToLastContinuous=false","--setParameter","requireConfirmInSetFcv=false","--bind_ip","0.0.0.0","--setParameter","enableTestCommands=1","--setParameter","testingDiagnosticsEnabled=1","--setParameter","disableLogicalSessionCacheRefresh=true","--storageEngine","wiredTiger","--setParameter","backtraceLogFile=/data/db/job0/mongorunner/nfmaa5ijjc25fsg7vh4as1684780265162.stacktrace","--setParameter","reshardingMinimumOperationDurationMillis=5000","--setParameter","coordinateCommitReturnImmediatelyAfterPersistingDecision=false","--setParameter","oplogApplicationEnforcesSteadyStateConstraints=true","--setParameter","minNumChunksForSessionsCollection=1","--setParameter","transactionLifetimeLimitSeconds=86400","--setParameter","orphanCleanupDelaySecs=1","--setParameter","receiveChunkWaitForRangeDeleterTimeoutMS=90000","--enableMajorityReadConcern","true","--setParameter","logComponentVerbosity={\"replication\":{\"rollback\":2},\"sharding\":{\"migration\":2,\"rangeDeleter\":2},\"transaction\":4,\"tenantMigration\":4}"]}}

Resmoke launches processes, mrlog does not matter:
[j0:c:prim] mongod started on port 20002 with pid 2504131.
[j0:s0:prim] mongod started on port 20000 with pid 2504298.
[j0:s0:sec] mongod started on port 20001 with pid 2504301.
 */

export class ProcessStartEvent {
    constructor(program : string, pid : number, port : number) {
        this.program = program;
        this.pid = pid;
        this.port = port;
      }

    program: string;
    pid: number;
    port : number;
}

const resmoke_fixture_parser = new RegExp(/(?<program>mongo\w?) started on port (?<port>\d+) with pid (?<pid>\d+)/);
const shell_fixture_parser = new RegExp(/shell: Started program( |","attr":){"pid":"(?<pid>\d+)","port":(?<port>-?\d+),"argv":\["(?<program>([\/\w]+))/);

export type ResmokeProcessStartEventHandler = (event: ProcessStartEvent) => void

class ResmokeParser implements CommandOutputParser {

    handler: ResmokeProcessStartEventHandler;

    constructor(handler: ResmokeProcessStartEventHandler) {
        this.handler = handler;
    }

    handleLine(line: string): void {
        // console.log("st", line);
        if(!line.startsWith("[")) {
            return;
        }

        const tag_end = line.indexOf(" ");
        if(tag_end == -1 ) {
            // Malformed
            return;
        }

        const log_line = line.slice(tag_end + 1);
        if(!log_line.startsWith("mongo")) {
            // console.log("bad line", log_line)
            //return;

            let test_match = shell_fixture_parser.exec(log_line);
            if (test_match === null) {
                // console.log(`could not parse line for resmoke - ${line}`);
                return;
            }
            let port = parseInt(test_match.groups?.port || "0");
            let pid = parseInt(test_match.groups?.pid || "0");
            let program = test_match.groups?.program || "unknown";

            console.log(`Found ${program} starting on port ${port} with ${pid}`);
            this.handler(new ProcessStartEvent(program, port, pid));
            return;
        }

        // mongo\w? started on port (\d+) with pid (\d+)
        let test_match = resmoke_fixture_parser.exec(log_line);
        if (test_match === null) {
            console.log(`could not parse line for resmoke - ${line}`);
            return;
        }
        let port = parseInt(test_match.groups?.port || "0");
        let pid = parseInt(test_match.groups?.pid || "0");
        let program = test_match.groups?.program || "unknown";

        console.log(`Found ${program} starting on port ${port} with ${pid}`);
        this.handler(new ProcessStartEvent(program, port, pid));
    }
}


export async function parseResmokeCommand(command : string, args : string[], callback: ResmokeProcessStartEventHandler ) : Promise<void> {
    let rp = new ResmokeParser(callback);

    let x = await runCommand(command, args, rp);

    console.log(x);
}
