/**
 * Logout endpoint - clears JWT cookie
 */
export const logout = (req, res) => {
  res.cookie('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0
  });
  res.status(200).json({ message: 'Wylogowano' });
};
