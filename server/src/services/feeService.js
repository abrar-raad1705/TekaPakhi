const feeService = {
    /**
     * Determine debit/credit amounts based on fee bearer
     * @returns {{ senderDebit, receiverCredit }}
     */
    applyFeeBearer(amount, fee, feeBearer) {
        if (feeBearer === "SENDER") {
            return {
                senderDebit: amount + fee,
                receiverCredit: amount,
            };
        } else {
            // RECEIVER bears the fee
            return {
                senderDebit: amount,
                receiverCredit: amount - fee,
            };
        }
    },
};

export default feeService;
