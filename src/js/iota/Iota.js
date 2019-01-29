import Trytes from 'trytes';
import getHealthyNode from './getHealthyNode';

/**
 * Class contains all IOTA related functions
 * nodeInitialization is always needed!
 */
export default class Iota {
  constructor() {
    this.tagLength = 27;
    this.depth = 3;
    this.minWeight = 14;
    this.tag = 'DVOTE';
  }

  async nodeInitialization() {
    this.iotaNode = await getHealthyNode();
  }

  /**
   * generates a new survey address
   */
  generateSurveyAddress() {
    const now = new Date().getTime();
    const random = Math.floor((Math.random() * 1000000) + 1);
    const trytes = `${this.tag}IOTASURVEYADDRESS${Trytes.encodeTextAsTryteString(now.toString())}${Trytes.encodeTextAsTryteString(random.toString()) + Trytes.encodeTextAsTryteString(now.toString())}`;
    return trytes.slice(0, 81);
  }

  send(tryteAddress, tryteMessage, tag) {
    const transfers = [
      {
        value: 0,
        address: tryteAddress,
        message: tryteMessage,
        tag,
      },
    ];
    return new Promise((resolve, reject) => {
      this.iotaNode.api.sendTransfer(tryteAddress,
        this.depth,
        this.minWeight,
        transfers, (err, res) => {
          if (!err) {
            return resolve(res);
          }
          return reject(err);
        });
    });
  }

  /**
   * Creates entry on tangle: unencrypted files need metadata,
   * encrypted files are found by file hash
   * @param {object} metadata
   * @param {boolean} unavailableData
   */
  vote(tryteAddress, voteObj) {
    const tryteMessage = Trytes.encodeTextAsTryteString(JSON.stringify(voteObj));
    this.send(tryteAddress, tryteMessage, this.tag);
  }

  getTransaction(searchVarsAddress) {
    return new Promise((resolve, reject) => {
      this.iotaNode.api.findTransactions(searchVarsAddress, (error, transactions) => {
        if (error) {
          reject(error);
        } else {
          resolve(transactions);
        }
      });
    });
  }

  /**
  * Get Transactions by address
  * @param {string} address
  */
  getTransactionByAddress(address) {
    const searchVarsAddress = {
      addresses: [address],
    };
    return this.getTransaction(searchVarsAddress);
  }

  /**
   * Returns the message of an Iota transaction
   * @param {string} transaction
   */
  getMessage(transaction) {
    return new Promise((resolve, reject) => {
      this.iotaNode.api.getBundle(transaction, (error, sucess2) => {
        if (error) {
          reject(error);
        } else {
          const message = sucess2[0].signatureMessageFragment;
          const [usedMessage] = message.split(
            '9999999999999999999999999999999999999',
          );
          let obj;
          if (usedMessage.length > 1) {
            try {
              obj = JSON.parse(Trytes.decodeTextFromTryteString(usedMessage));
            } catch (er) {
              console.error(Error.IOTA_INVALID_JSON);
            }
          }

          resolve(obj);
        }
      });
    });
  }
}
