const requestMeta = (req, res, next) => {
  req.meta = {
    ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress,
    userAgent: req.headers['user-agent'] || null,
  };
  next();
};

export default requestMeta;
