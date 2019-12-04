/*
    This file is part of web3.js.

    web3.js is free software: you can redistribute it and/or modify
    it under the terms of the GNU Lesser General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    web3.js is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Lesser General Public License for more details.

    You should have received a copy of the GNU Lesser General Public License
    along with web3.js.  If not, see <http://www.gnu.org/licenses/>.
*/
/**
 * @file AbstractObservedTransactionMethod.js
 * @author Samuel Furter <samuel@ethereum.org>
 * @date 2019
 */

import PromiEvent from '../../PromiEvent';
import Method from "../../../../../core/src/json-rpc/methods/Method";
import TransactionReceipt from "../../../types/output/TransactionReceipt";

export default class AbstractObservedTransactionMethod extends Method {
    /**
     * @param {String} rpcMethod
     * @param {Number} parametersAmount
     * @param {Array} parameters
     * @param {JsonRpcConfiguration} config
     * @param {AbstractTransactionObserver} transactionObserver
     *
     * @constructor
     */
    constructor(rpcMethod, parametersAmount, parameters, config, transactionObserver) {
        super(rpcMethod, parametersAmount, parameters, config);

        this.transactionObserver = transactionObserver;
        this.promiEvent = new PromiEvent();
    }

    /**
     * TODO: REMOVE THIS
     * This type will be used in the AbstractMethodFactory.and BatchRequest class
     *
     * @returns {String}
     */
    static get Type() {
        return 'observed-transaction-method';
    }

    /**
     * This type will be used in the AbstractMethodFactory and BatchRequest class
     *
     * @returns {String}
     */
    get Type() {
        return 'observed-transaction-method';
    }

    /**
     * Sends the request and returns a PromiEvent Object
     *
     * @method execute
     *
     * @returns {PromiEvent}
     */
    execute() {
        this.beforeExecution(this.config);

        this.config.currentProvider
            .send(this.rpcMethod, this.parameters)
            .then((transactionHash) => {
                let confirmations, receipt;

                this.promiEvent.emit('transactionHash', transactionHash);

                const transactionConfirmationSubscription = this.transactionObserver.observe(transactionHash).subscribe(
                    (transactionConfirmation) => {
                        confirmations = transactionConfirmation.confirmations;
                        receipt = transactionConfirmation.receipt;

                        if (!receipt.status) {
                            if (this.parameters[0].gas === receipt.gasUsed) {
                                this.handleError(
                                    new Error(
                                        `Transaction ran out of gas. Please provide more gas:\n${JSON.stringify(
                                            receipt,
                                            null,
                                            2
                                        )}`
                                    ),
                                    receipt,
                                    confirmations
                                );

                                transactionConfirmationSubscription.unsubscribe();

                                return;
                            }

                            this.handleError(
                                new Error(
                                    `Transaction has been reverted by the EVM:\n${JSON.stringify(receipt, null, 2)}`
                                ),
                                receipt,
                                confirmations
                            );

                            transactionConfirmationSubscription.unsubscribe();

                            return;
                        }

                        this.promiEvent.emit('confirmation', confirmations, new TransactionReceipt(receipt));
                    },
                    (error) => {
                        this.handleError(error, receipt, confirmations);
                    },
                    () => {
                        if (this.promiEvent.listenerCount('receipt') > 0) {
                            this.promiEvent.emit('receipt', this.afterExecution(receipt));
                            this.promiEvent.removeAllListeners();

                            return;
                        }

                        this.promiEvent.resolve(this.afterExecution(receipt));
                    }
                );
            })
            .catch((error) => {
                this.handleError(error, false, 0);
            });

        // TODO: Return Transaction object with hash and methods (mined(), confirmations(), etc.)
        return this.promiEvent;
    }

    /**
     * This methods calls the correct error methods of the PromiEvent object.
     *
     * @method handleError
     *
     * @param {Error} error
     * @param {Object} receipt
     * @param {Number} confirmations
     */
    handleError(error, receipt, confirmations) {
        if (this.promiEvent.listenerCount('error') > 0) {
            this.promiEvent.emit('error', error, receipt, confirmations);
            this.promiEvent.removeAllListeners();

            return;
        }

        this.promiEvent.reject(error);
    }
}
