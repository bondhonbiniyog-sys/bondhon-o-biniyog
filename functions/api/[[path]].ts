import { handleLocalApi } from '../../src/services/localBackend';

export const onRequest = async (context: {
  request: Request;
  env?: any;
  params?: any;
  next?: () => Promise<Response>;
}): Promise<Response> => {
  const { request } = context;
  const url = new URL(request.url);

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  let body: any = undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
      const text = await request.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch (e) {
      // Ignore body parse errors
    }
  }

  try {
    const { status, data } = await handleLocalApi(url.pathname + url.search, request.method, body);

    return new Response(JSON.stringify(data), {
      status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'X-Powered-By': 'Cloudflare-Pages-Functions',
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, message: 'Serverless Function Error: ' + (err?.message || err) }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
};
