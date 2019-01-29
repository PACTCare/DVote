import '../css/input.css';
import '../css/main.css';
import '../css/output.css';
import '../css/style.css';
import Iota from './iota/Iota';
import getURLParameter from './helperFunctions/getURLParameter';
import Signature from './crypto/Signature';

const iota = new Iota();
const voteA = 'A';
const voteB = 'B';

let pointA = 1;
let pointB = 1;
let totalVotes = pointA + pointB;

function updatePoints() {
  const percentA = (pointA / totalVotes) * 100;
  const percentB = (pointB / totalVotes) * 100;
  document.getElementById('size-one').textContent = `${Math.round(percentA)}%`;
  document.getElementById('size-two').textContent = `${Math.round(percentB)}%`;
  document.getElementById('voting-box').style.gridTemplateColumns = `${percentA}% ${percentB}%`;
  document.getElementById('total-votes').textContent = `Total Votes Casted: ${totalVotes - 2}`;
  document.getElementById('total-left').textContent = pointA - 1;
  document.getElementById('total-right').textContent = pointB - 1;
}

function addleft() {
  pointA += 1;
  totalVotes += 1;
  updatePoints();
}

function addright() {
  pointB += 1;
  totalVotes += 1;
  updatePoints();
}

function setup(aVotes = 0, bVotes = 0) {
  pointA = 1 + aVotes;
  pointB = 1 + bVotes;
  totalVotes = pointA + pointB;
  updatePoints();
}

/**
 * Create survey layout
 */
function createSurvey() {
  const address = iota.generateSurveyAddress();
  document.getElementById('divVoteLayout').style.display = 'none';
  document.getElementById('iotaAddress').value = address;
  document.getElementById('createSruvey').addEventListener('click', (event) => {
    event.preventDefault();
    const iotaAdd = document.getElementById('iotaAddress').value;
    const title = encodeURIComponent(document.getElementById('survey-title').value);
    const optA = encodeURIComponent(document.getElementById('optionA').value);
    const optB = encodeURIComponent(document.getElementById('optionB').value);
    const link = `${window.location.href}?iotaAdd=${iotaAdd}&title=${title}&optA=${optA}&optB=${optB}`;
    window.open(link, '_self');
  });
}

/**
 * Send signed vote to IOTA
 * @param {String} publicHexKey
 * @param {Object} sig
 * @param {Object} keys
 * @param {String} urliotaAdd
 * @param {String} voteLetter
 */
async function vote(publicHexKey, sig, keys, urliotaAdd, voteLetter) {
  const voteObj = { time: new Date().toLocaleString(), vote: voteLetter, publicKey: publicHexKey };
  const signature = await sig.sign(keys.privateKey, JSON.stringify(voteObj));
  voteObj.signature = btoa(String.fromCharCode(...new Uint8Array(signature)));
  iota.vote(urliotaAdd, voteObj);
}

/**
 * Create vote layout
 * @param {String} urliotaAdd
 * @param {String} urltitle
 * @param {String} urloptA
 * @param {String} urloptB
 */
async function voteLayout(urliotaAdd, urltitle, urloptA, urloptB) {
  const sig = new Signature();
  const keys = await sig.getKeys();
  const publicHexKey = await sig.exportPublicKey(keys.publicKey);
  document.getElementById('signature').textContent = `Your public signature key: ${publicHexKey}`;
  const transactions = await iota.getTransactionByAddress(urliotaAdd);
  if (typeof transactions !== 'undefined' && transactions.length > 0) {
    const awaitMessages = [];
    for (let i = 0; i < transactions.length; i += 1) {
      awaitMessages.push(iota.getMessage(transactions[i]));
    }
    const messages = await Promise.all(awaitMessages);
    let aVotes = 0;
    let bVotes = 0;
    for (let j = 0; j < messages.length; j += 1) {
      const mesSignature = messages[j].signature;
      delete messages[j].signature;
      // eslint-disable-next-line no-await-in-loop
      const isVerified = await sig.verify(await sig.importPublicKey(messages[j].publicKey),
        mesSignature,
        JSON.stringify(messages[j]));
      if (isVerified) {
        if (messages[j].vote === voteA) {
          aVotes += 1;
        } else if (messages[j].vote === voteB) {
          bVotes += 1;
        }
      }
    }
    setup(aVotes, bVotes);
  } else {
    setup();
  }
  document.getElementById('divCreateLayout').style.display = 'none';
  document.getElementById('titleSurvey').textContent = urltitle;
  document.getElementById('optA').textContent = urloptA;
  document.getElementById('optB').textContent = urloptB;
  document.getElementById('left-label').textContent = urloptA;
  document.getElementById('right-label').textContent = urloptB;
  document.getElementById('leftClick').addEventListener('click', async () => {
    await vote(publicHexKey, sig, keys, urliotaAdd, voteA);
    addleft();
  });
  document.getElementById('rightClick').addEventListener('click', async () => {
    await vote(publicHexKey, sig, keys, urliotaAdd, voteB);
    addright();
  });
}

/**
 * Initialize layout
 */
async function initLayout() {
  await iota.nodeInitialization();
  const urliotaAdd = getURLParameter('iotaAdd');
  const urltitle = getURLParameter('title');
  const urloptA = getURLParameter('optA');
  const urloptB = getURLParameter('optB');
  if (typeof urliotaAdd !== 'undefined'
    && typeof urltitle !== 'undefined'
    && typeof urloptA !== 'undefined'
    && typeof urloptB !== 'undefined') {
    voteLayout(urliotaAdd, urltitle, urloptA, urloptB);
  } else {
    createSurvey();
  }
}

window.onload = function init() {
  initLayout();
};
