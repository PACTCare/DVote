import '../css/input.css';
import '../css/main.css';
import '../css/output.css';
import '../css/style.css';
import Iota from './iota/Iota';
import getURLParameter from './helperFunctions/getURLParameter';
import Signature from './crypto/Signature';

const iota = new Iota();

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

// new functions!
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
      console.log(messages[j]);
      delete messages[j].signature;
      // eslint-disable-next-line no-await-in-loop
      const isVerified = await sig.verify(await sig.importPublicKey(messages[j].publicKey),
        mesSignature,
        JSON.stringify(messages[j]));
      console.log(isVerified);
      if (isVerified) {
        if (messages[j].vote === 'A') {
          aVotes += 1;
        } else if (messages[j].vote === 'B') {
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
    const voteObj = { time: new Date().toLocaleString(), vote: 'A', publicKey: publicHexKey };
    const signature = await sig.sign(keys.privateKey, JSON.stringify(voteObj));
    voteObj.signature = btoa(String.fromCharCode(...new Uint8Array(signature)));
    iota.vote(urliotaAdd, voteObj);
    addleft();
  });
  document.getElementById('rightClick').addEventListener('click', async () => {
    const voteObj = { time: new Date().toLocaleString(), vote: 'B', publicKey: publicHexKey };
    const signature = await sig.sign(keys.privateKey, JSON.stringify(voteObj));
    voteObj.signature = btoa(String.fromCharCode(...new Uint8Array(signature)));
    iota.vote(urliotaAdd, voteObj);
    addright();
  });
}

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
    createSurvey(iota);
  }
}

window.onload = function init() {
  initLayout();
};
