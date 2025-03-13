const roleCheck = (roles) => {
  return (req, res, next) => {
    const userRole = req.user.role;
    if (!roles.includes(userRole)) {
      return res.status(403).json({ message: 'Brak uprawnień do tej sekcji' });
    }
    next();
  };
};

export default roleCheck;