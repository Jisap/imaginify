import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  publicRoutes: ['/api/webhooks/clerk', '/api/webhooks/stripe'] //Rutas sin autenticación
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"], //Rutas con autenticación
};