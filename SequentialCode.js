const fs = require("fs");
const perf = require("execution-time")();
const data = require("./smallData.js");
const nodes = [];
const nodesFriends = [];
const edges = [];
const power = [];
const allData = [];

function getFriends(node) {
  const list = [];
  data.map(set => {
    if (set.node.includes(node)) {
      set.node.map(a => {
        if (a != node && !list.includes(a)) {
          list.push(a);
        }
      });
    }
  });

  return list;
}

function setInfluence() {
  data.map(a => {
    a.node.map(node => {
      power[node].value += a.power;
      power[node].total += 1;
    });
  });
}

function processData() {
  data.map(set => {
    set.node.map(node => {
      edges.push(set.node);
      if (!nodes.includes(node)) {
        // add to list
        nodes[node] = node;
        // set friends
        nodesFriends[node] = getFriends(node);
        power[node] = {
          value: 0,
          total: 0
        };
      }
    });
  });

  setInfluence();
}

function getIndexOf(node1, node2) {
  data.map((set, index) => {
    if (set.node.includes(node1) && set.node.includes(node2)) {
      return set;
    }
  });
  return {};
}

function getInfluenceSet(node, friends) {
  const list = [];

  friends[node].map(friend => {
    data.map(set => {
      if (set.node.includes(node) && set.node.includes(friend)) {
        if (power[node]) {
          if (set.power <= power[node].value / power[node].total) {
            list.push(friend);
          }
        }
      }
    });
  });

  return list;
}

function compare(a, b) {
  if (a.list.length > b.list.length) {
    return -1;
  }
  return 1;
}

function print(k) {
  console.log("started data processing of ", data.length, " edges... @", new Date().toTimeString());
  processData();

  if (nodesFriends[3].length > 0) {
    nodes.map(node => {
      const l = getInfluenceSet(node, nodesFriends);
      allData.push({
        node: node,
        list: l
      });
    });
  }

  // add influenced neighbours to each list
  data.map(set => {
    set.node.map(node => {
      allData.map(sets => {
        if (sets.node == node) {
          sets.list.map(a => {
            if (a != node) {
              allData.map(n => {
                if (n.node == a) {
                  n.list.map(l => {
                    if (sets.list.includes(l) == false) {
                      sets.list.push(l);
                    }
                  });
                }
              });
            }
          });
        }
      });
    });
  });
  allData.sort(compare);
  console.log("Sorting the data...");
  for (let i = 0; i < k; i++) {
    console.log("The ", i + 1, "th most influential node is ", allData[i].node);
  }
}
//at beginning of your code
perf.start();
if (process.argv.length > 2) {
  print(process.argv.pop());
  const results = perf.stop();
  console.log("Execution time ", results.time, " ms");
} else {
  console.info(
    "Please enter the k value to be computed ex: node <program.js> <k value>"
  );
}
