const transactionService = require('../services/transactionService');

const transactionController = {
  /**
   * POST /api/v1/transactions/send-money
   */
  async sendMoney(req, res, next) {
    try {
      const result = await transactionService.execute({
        senderProfileId: req.user.profileId,
        receiverPhone: req.validatedBody.receiverPhone,
        amount: req.validatedBody.amount,
        typeCode: 'SEND_MONEY',
        pin: req.validatedBody.pin,
        note: req.validatedBody.note,
      });
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/transactions/cash-in
   */
  async cashIn(req, res, next) {
    try {
      const result = await transactionService.execute({
        senderProfileId: req.user.profileId,
        receiverPhone: req.validatedBody.receiverPhone,
        amount: req.validatedBody.amount,
        typeCode: 'CASH_IN',
        pin: req.validatedBody.pin,
        note: req.validatedBody.note,
      });
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/transactions/cash-out
   */
  async cashOut(req, res, next) {
    try {
      const result = await transactionService.execute({
        senderProfileId: req.user.profileId,
        receiverPhone: req.validatedBody.receiverPhone,
        amount: req.validatedBody.amount,
        typeCode: 'CASH_OUT',
        pin: req.validatedBody.pin,
        note: req.validatedBody.note,
      });
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/transactions/payment
   */
  async payment(req, res, next) {
    try {
      const result = await transactionService.execute({
        senderProfileId: req.user.profileId,
        receiverPhone: req.validatedBody.receiverPhone,
        amount: req.validatedBody.amount,
        typeCode: 'PAYMENT',
        pin: req.validatedBody.pin,
        note: req.validatedBody.note,
      });
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/transactions/pay-bill
   */
  async payBill(req, res, next) {
    try {
      const result = await transactionService.execute({
        senderProfileId: req.user.profileId,
        receiverPhone: req.validatedBody.receiverPhone,
        amount: req.validatedBody.amount,
        typeCode: 'PAY_BILL',
        pin: req.validatedBody.pin,
        note: req.validatedBody.note,
      });
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/transactions/b2b
   */
  async b2b(req, res, next) {
    try {
      const result = await transactionService.execute({
        senderProfileId: req.user.profileId,
        receiverPhone: req.validatedBody.receiverPhone,
        amount: req.validatedBody.amount,
        typeCode: 'B2B',
        pin: req.validatedBody.pin,
        note: req.validatedBody.note,
      });
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/transactions/preview
   */
  async preview(req, res, next) {
    try {
      const { receiverPhone, amount } = req.validatedBody;
      const typeCode = req.params.type?.toUpperCase();
      const result = await transactionService.preview({
        senderProfileId: req.user.profileId,
        receiverPhone,
        amount,
        typeCode,
      });
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/transactions/history
   */
  async history(req, res, next) {
    try {
      const filters = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        type: req.query.type || null,
        fromDate: req.query.fromDate || null,
        toDate: req.query.toDate || null,
      };
      const result = await transactionService.getHistory(req.user.profileId, filters);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/transactions/mini-statement
   */
  async miniStatement(req, res, next) {
    try {
      const transactions = await transactionService.getMiniStatement(req.user.profileId);
      res.status(200).json({ success: true, data: transactions });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/transactions/:id
   */
  async detail(req, res, next) {
    try {
      const tx = await transactionService.getDetail(req.params.id, req.user.profileId);
      res.status(200).json({ success: true, data: tx });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = transactionController;
