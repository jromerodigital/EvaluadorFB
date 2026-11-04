const APISPERU_TOKEN =
  import.meta.env.VITE_APISPERU_TOKEN ||
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6ImpvcmdlLmlubXVlYmxlc3BlQGdtYWlsLmNvbSIsImp0aSI6Ijk1OTI5MzJiMDdlYjAxMjQifQ.y9Z64Gr3eqp7g30BUEBXgXQAV1L2BPZeywUP5EKmclw';

export interface DniResponse {
  success: boolean;
  dni?: string;
  nombres?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  nombreCompleto?: string;
  codVerifica?: number;
  message?: string;
}

export interface RucResponse {
  success: boolean;
  ruc?: string;
  razonSocial?: string;
  nombreComercial?: string | null;
  estado?: string;
  condicion?: string;
  direccion?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  message?: string;
}

export const toTitleCase = (str: string): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (
        index > 0 &&
        ['de', 'del', 'la', 'las', 'los', 'y', 'e'].includes(lower)
      ) {
        return lower;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
};

export const consultarDni = async (dni: string): Promise<DniResponse> => {
  const cleanDni = dni.replace(/\D/g, '');
  if (!/^\d{8}$/.test(cleanDni)) {
    return {
      success: false,
      message: 'El DNI debe tener 8 dígitos numéricos.',
    };
  }

  if (!APISPERU_TOKEN) {
    return {
      success: false,
      message: 'Token de consulta no configurado. Ingresa tu nombre manualmente.',
    };
  }

  const url = `https://dniruc.apisperu.com/api/v1/dni/${encodeURIComponent(
    cleanDni
  )}?token=${encodeURIComponent(APISPERU_TOKEN)}`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      if (res.status === 404)
        return { success: false, message: 'DNI no encontrado en RENIEC.' };
      if (res.status === 401 || res.status === 403)
        return {
          success: false,
          message: 'Token de consulta no autorizado o cuota superada.',
        };
      return {
        success: false,
        message: `Error del servidor (${res.status}).`,
      };
    }

    const data = await res.json();
    if (data.success === false || (!data.nombres && !data.apellidoPaterno)) {
      return {
        success: false,
        message: data.message || 'No se encontraron resultados en RENIEC.',
      };
    }

    const rawFullName = `${data.nombres || ''} ${data.apellidoPaterno || ''} ${
      data.apellidoMaterno || ''
    }`.trim();
    return {
      success: true,
      dni: data.dni || cleanDni,
      nombres: data.nombres,
      apellidoPaterno: data.apellidoPaterno,
      apellidoMaterno: data.apellidoMaterno,
      nombreCompleto: toTitleCase(rawFullName) || rawFullName,
      codVerifica: data.codVerifica,
    };
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        message: 'Tiempo de espera agotado. Ingresa tu nombre manualmente.',
      };
    }
    return {
      success: false,
      message:
        'Servicio no disponible temporalmente. Ingresa tu nombre manualmente.',
    };
  }
};

export const consultarRuc = async (ruc: string): Promise<RucResponse> => {
  const cleanRuc = ruc.replace(/\D/g, '');
  if (!/^\d{11}$/.test(cleanRuc)) {
    return {
      success: false,
      message: 'El RUC debe tener 11 dígitos numéricos.',
    };
  }

  if (!APISPERU_TOKEN) {
    return {
      success: false,
      message: 'Token de consulta no configurado. Ingresa los datos manualmente.',
    };
  }

  const url = `https://dniruc.apisperu.com/api/v1/ruc/${encodeURIComponent(
    cleanRuc
  )}?token=${encodeURIComponent(APISPERU_TOKEN)}`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      if (res.status === 404)
        return { success: false, message: 'RUC no encontrado en SUNAT.' };
      if (res.status === 401 || res.status === 403)
        return {
          success: false,
          message: 'Token de consulta no autorizado o cuota superada.',
        };
      return {
        success: false,
        message: `Error del servidor (${res.status}).`,
      };
    }

    const data = await res.json();
    if (data.success === false || !data.razonSocial) {
      return {
        success: false,
        message:
          data.message || 'No se encontró la razón social para este RUC.',
      };
    }

    return {
      success: true,
      ruc: data.ruc || cleanRuc,
      razonSocial: toTitleCase(data.razonSocial) || data.razonSocial,
      nombreComercial: data.nombreComercial,
      estado: data.estado,
      condicion: data.condicion,
      direccion: data.direccion,
      departamento: data.departamento,
      provincia: data.provincia,
      distrito: data.distrito,
    };
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        message: 'Tiempo de espera agotado. Ingresa los datos manualmente.',
      };
    }
    return {
      success: false,
      message:
        'Servicio no disponible temporalmente. Ingresa los datos manualmente.',
    };
  }
};
