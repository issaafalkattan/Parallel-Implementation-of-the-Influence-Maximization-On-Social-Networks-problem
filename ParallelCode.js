 // MPI import
 var cluster = require('cluster');
 var data = require('./data.js');
 const perf = require('execution-time')();

 const nodes = [];
 const nodesFriends = [];
 const edges = [];
 const power = [];
 var allData = [];

 // Master worker
 if (cluster.isMaster) {
     var numWorkers = require('os').cpus().length;

     console.log('Master cluster setting up ' + numWorkers + ' workers...');

     for (var i = 0; i < numWorkers; i++) {
         cluster.fork();
     }
     // after forking the workers the master will process the data
     console.log("Master started data processing of ", data.length, " edges... @", new Date().toTimeString());

     perf.start();

     processData();
     // split nodes among the available workers 
     var start = 0;
     var chunk = parseInt(nodes.length / numWorkers);
     var first = true;
     var startIndex = 0;
     var iterations = 0;

     var chunkS = parseInt(data.length / numWorkers);
     if (nodesFriends[3] && nodesFriends[3].length > 0) {
         cluster.on('online', function (worker) {
             if (first == true) {
                 worker.send({
                     start: start,
                     chunk: chunk,
                     nodes: nodesFriends,
                     all: nodes,
                     power: power,
                     flag: 'first'
                 });

                 // increase start for next worker
                 start += chunk;

                 worker.on('message', function (message) {
                     if (message) {
                         message.map(a => {
                             allData[a.node] = a;
                         })
                     }
                 });

             } else {
                 
               if(iterations == numWorkers){
                worker.send({
                    start: startIndex,
                    chunk: chunkS,
                    allData: allData,
                    flag: "second",
                    end : true,
                });
               }
               else{
                 worker.send({
                     start: startIndex,
                     chunk: chunkS,
                     allData: allData,
                     flag: "second",
                     end : false,
                 });
                }
                 startIndex += chunkS;
                 iterations++;
                 worker.on('message', function (message) {
                     if (message.flag == "second") {
                         const newData = message.data;
                         for (var i = 0; i < newData.length; i++) {

                             if (newData[i] && allData[i] && newData[i].node == allData[i].node) {
                                 if (newData[i].list.length > allData[i].list.length) {
                                     allData[i].list = newData[i].list;
                                 }
                             }
                         }
                     }
                 });

             }
         });

     }


     var dead = 0;
     cluster.on('exit', function (worker, code, signal) {

         // console.log('Starting a new worker');
         // cluster.fork();
         dead++;
         // if all processes are now dead

         if (dead == numWorkers) {
             first = false;
             // fork a new set of processors 
             for (var i = 0; i < numWorkers; i++) {
                 cluster.fork();
             }


         }
         // if all workers are dead for the second time
         if (dead == numWorkers * 2) {
             allData.sort(compare);
             for (var i = 0; i < 4; i++) {
                 console.log("The ", (i + 1), "th most influential node is ", allData[i].node);
             }
             const results = perf.stop();

             console.log("Execution time ", results.time, " ms");
         }
     });
 } else {
     process.on('message', function (message) {
         if (message.flag == "first") {
             const friends = message.nodes;
             if (friends[3].length > 0) {
                 const power = message.power;
                 const start = message.start;
                 const chunk = message.chunk;
                 const all = message.all;
                 var end;
                 if ((start + chunk > all.length) || all.length - chunk < start) {
                     end = all.length;
                 } else {
                     end = start + chunk;
                 }

                 const myNodes = [];
                 for (var i = start; i <= end; i++) {
                     if (all[i] != null) {
                         myNodes.push(all[i]);

                     }
                 }
                 const myData = [];

                 myNodes.map(node => {
                     if (node != null) {
                         const l = getInfluenceSet(node, friends, power);
                         myData.push({
                             node: node,
                             list: l
                         });
                     }
                 });
                 process.send(myData);

             }
             process.exit(0);
         }

     });
     // second batch of work

     process.on('message', function (message) {
         if (message.flag == "second") {
             const start = message.start;
             const chunk = message.chunk;
             var end;
             if(message.end == true){
                 end = data.length;
             }
             else {
                 end = start + chunk;
             }
             const allData = message.allData;
             const myPart = data.slice(start, end);
             myPart.map(set => {
                 set.node.map(node => {
                     allData.map(sets => {
                         if (sets != null && sets.node && node != null) {
                             if (sets.node == node) {
                                 sets.list.map(a => {
                                     if (a != node) {
                                         allData.map(n => {
                                             if (n && n.node == a) {
                                                 n.list.map(l => {
                                                     if (includes(sets.list,l) == false) {
                                                         sets.list.push(l);
                                                     }
                                                 })
                                             }
                                         })
                                     }
                                 })
                             }
                         }
                     })

                 })
             })
             process.send({
                 data: allData,
                 flag: 'second'
             });
             process.exit(0);
         }
     })

 }

 function getFriends(node) {
     const list = [];
     data.map(set => {
         if (set.node){
         if(includes(set.node, node)) {
             set.node.map(a => {
                 if (a != node && !includes(list, a)) {
                     list.push(a)
                 }
             })
         }
         }
     });

     return list;
 }

 function processData() {

     data.map(set => {

         set.node.map(node => {
             edges.push(set.node);
             if(nodes){
             if (!includes(nodes, node)) {
                 // add to list
                 nodes[node] = node;
                 // set friends
                 nodesFriends[node] = getFriends(node);
                 power[node] = {
                     value: 0,
                     total: 0
                 };
             }
            }
         })
         
     });

     setInfluence();
 }

 function setInfluence() {
     data.map(a => {
         a.node.map(node => {
             power[node].value += a.power;
             power[node].total += 1;
         })
     });
 }

 function getInfluenceSet(node, friends, powerSet) {
     const list = [];
     if (friends[node]) {
         friends[node].map(friend => {
             data.map((set) => {
                 if (set.node && includes(set.node,node) && set.node && includes(set.node,friend)) {
                     if (powerSet[node]) {
                         if (set.power <= (powerSet[node].value / powerSet[node].total)) {
                             list.push(friend);
                         }
                     }
                 }
             })

         })
     }
     return list;

 }

 function compare(a, b) {
     if (a.list.length > b.list.length) {
         return -1;
     }
     return 1;
 }
 function includes(arr, variable){
     for(var i=0; i<arr.length;i++){
         if(arr[i] == variable){
             return true;
         }
     }
return false;
 }