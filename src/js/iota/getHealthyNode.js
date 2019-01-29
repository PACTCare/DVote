import IOTA from 'iota.lib.js';
import { NODES, NODE_TIMEOUT } from './iotaConfig';

/**
 * Shuffels the list of potential nodes to reduce the traffic to one specific node
 * @param {array} array
 */
function shuffleArray(array) {
  const pArray = array;
  let currentIndex = array.length; let temporaryValue; let
    randomIndex;

  // While there remain elements to shuffle...
  while (currentIndex !== 0) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    pArray[currentIndex] = array[randomIndex];
    pArray[randomIndex] = temporaryValue;
  }

  return pArray;
}

async function getHealthStatus(iotaNode) {
  return new Promise((resolve, reject) => {
    iotaNode.api.setApiTimeout(NODE_TIMEOUT);
    iotaNode.api.getNodeInfo((error, success) => {
      if (error) {
        return reject(error);
      }
      return resolve(success);
    });
  });
}

/**
 * Returns healthy IOTA Node
 */
export default async function getHealthyNode() {
  const shuffeledNodes = shuffleArray(NODES);
  for (let i = 0; i < shuffeledNodes.length; i += 1) {
    const node = shuffeledNodes[i];
    const iotaNode = new IOTA({ provider: node });
    try {
      // eslint-disable-next-line no-await-in-loop
      const nodeHealth = await getHealthStatus(iotaNode);
      if (nodeHealth.latestMilestone === nodeHealth.latestSolidSubtangleMilestone
        && nodeHealth.latestMilestoneIndex === nodeHealth.latestSolidSubtangleMilestoneIndex) {
        return iotaNode;
      }
    } catch (error) {
      console.error(`The following node is unavailable: ${node}`);
    }
  }
  return undefined;
}
