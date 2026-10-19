// Compatibility for existing dashboard bookmarks; all requests use Tenant Studio.
export { GET, POST, PUT, DELETE } from '../../customer-dashboard/[...path]/route';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
