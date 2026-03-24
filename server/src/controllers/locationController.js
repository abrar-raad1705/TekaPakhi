import locationModel from '../models/locationModel.js';

const locationController = {
  async districts(req, res, next) {
    try {
      const districts = await locationModel.listDistricts();
      res.json({ success: true, data: districts });
    } catch (e) {
      next(e);
    }
  },

  async areas(req, res, next) {
    try {
      const { district } = req.query;
      if (!district || typeof district !== 'string') {
        return res.status(400).json({ success: false, message: 'district query is required' });
      }
      const areas = await locationModel.listAreasByDistrict(district);
      res.json({ success: true, data: areas });
    } catch (e) {
      next(e);
    }
  },
};

export default locationController;
