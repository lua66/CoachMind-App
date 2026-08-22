export const adminAuth = {
  verifyIdToken: async (_token: string) => ({
    uid: 'local-user',
    email: 'coach@example.com',
  }),
};

