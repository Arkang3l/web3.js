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
 * @file send.js
 * @author Samuel Furter <samuel@ethereum.org>
 * @date 2019
 */

import GetGasPriceMethod from "internal/ethereum/src/methods/eth/node/GetGasPriceMethod";
import EstimateGasMethod from "internal/ethereum/src/methods/eth/EstimateGasMethod";
import SendTransactionMethod from "internal/ethereum/src/methods/eth/transaction/SendTransactionMethod";
import TransactionOptionsProperties from "internal/ethereum/lib/types/input/interfaces/TransactionOptionsProperties";
import EthereumConfiguration from 'internal/ethereum/src/config/EthereumConfiguration.js';
import ConfigurationTypes from "../../config/ConfigurationTypes";
import getConfig from "../../config/getConfig";

/**
 * Returns the transaction hash and pre-fills missing properties if possible.
 *
 * @param {TransactionOptionsProperties} txOptions
 * @param {EthereumConfiguration} config
 *
 * @returns {Promise<String>}
 */
export default async function send(txOptions: TransactionOptionsProperties, config?: EthereumConfiguration): Promise<string> {
    const mappedConfig = getConfig(ConfigurationTypes.ETHEREUM, config);

    if (!txOptions.gasPrice && txOptions.gasPrice !== 0) {
        if (!mappedConfig.transaction.gasPrice) {
            txOptions.gasPrice = await new GetGasPriceMethod(mappedConfig).execute()
        } else {
            txOptions.gasPrice = mappedConfig.transaction.gasPrice;
        }
    }

    if (!txOptions.gas) {
        txOptions.gas = await new EstimateGasMethod(mappedConfig, [txOptions]).execute();
    }

    // TODO: Create new wallet. Probably a user password should get passed here to unlock the specific account.
    // if (this.hasAccounts() && this.isDefaultSigner()) {
    //     const account = config.wallet.getAccount(txOptions.from);
    //
    //     if (account) {
    //         return this.sendRawTransaction(account);
    //     }
    // }
    //
    // if (this.hasCustomSigner()) {
    //     return this.sendRawTransaction();
    // }

    return new SendTransactionMethod(mappedConfig, [txOptions]).execute();
}

