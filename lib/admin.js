// Safe to import from client components (no server dependencies).
export const ADMIN_EMAIL = "galpaz2210@gmail.com";

export const isAdminEmail = (email) => email?.toLowerCase() === ADMIN_EMAIL;
