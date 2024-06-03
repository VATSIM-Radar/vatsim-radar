import { setCookie } from 'h3';

export default defineEventHandler(event => {
    setCookie(event, 'access-token', '', {
        maxAge: 0,
        secure: true,
        httpOnly: true,
    });

    return sendRedirect(event, useRuntimeConfig().public.DOMAIN);
});
