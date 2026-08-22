// Manager for dynamic single-use activation code sequences

export interface ActivationCodeStatus {
  monthlyCurrentCode: string;
  monthlyNextCode: string;
  annualCurrentCode: string;
  annualNextCode: string;
  usedCodes: string[];
}

// Local storage key for persistent sequence state
const STORAGE_KEY_USED_CODES = 'coachmind_used_activation_codes';
const STORAGE_KEY_MONTHLY_INDEX = 'coachmind_monthly_code_index';
const STORAGE_KEY_ANNUAL_INDEX = 'coachmind_annual_code_index';

// Helpers to calculate code strings from index
export function getMonthlyCodeForIndex(index: number): string {
  const num = 1 + index * 2; // 1, 3, 5, 7, 9, 11...
  const padded = String(num).padStart(2, '0');
  return `BIZUMPRO${padded}`;
}

export function getAnnualCodeForIndex(index: number): string {
  const num = 1 + index * 3; // 1, 4, 7, 10, 13, 16...
  const padded = String(num).padStart(2, '0');
  return `PRO2026${padded}`;
}

export function getStoredCodeState(): { monthlyIndex: number; annualIndex: number; usedCodes: string[] } {
  try {
    const usedCodesRaw = localStorage.getItem(STORAGE_KEY_USED_CODES);
    const usedCodes: string[] = usedCodesRaw ? JSON.parse(usedCodesRaw) : [];

    const mIdxRaw = localStorage.getItem(STORAGE_KEY_MONTHLY_INDEX);
    const monthlyIndex = mIdxRaw ? parseInt(mIdxRaw, 10) : 0;

    const aIdxRaw = localStorage.getItem(STORAGE_KEY_ANNUAL_INDEX);
    const annualIndex = aIdxRaw ? parseInt(aIdxRaw, 10) : 0;

    return { monthlyIndex, annualIndex, usedCodes };
  } catch (e) {
    return { monthlyIndex: 0, annualIndex: 0, usedCodes: [] };
  }
}

export function getCurrentCodeStatus(): ActivationCodeStatus {
  const { monthlyIndex, annualIndex, usedCodes } = getStoredCodeState();

  return {
    monthlyCurrentCode: getMonthlyCodeForIndex(monthlyIndex),
    monthlyNextCode: getMonthlyCodeForIndex(monthlyIndex + 1),
    annualCurrentCode: getAnnualCodeForIndex(annualIndex),
    annualNextCode: getAnnualCodeForIndex(annualIndex + 1),
    usedCodes,
  };
}

export interface ValidationResult {
  success: boolean;
  message: string;
  plan?: 'monthly' | 'annual';
  codeUsed?: string;
  nextExpectedCode?: string;
  credits?: number;
}

/**
 * Validates and consumes an activation code.
 * Enforces single-use rules and auto-advances the sequence.
 */
export function validateAndConsumeCode(rawInputCode: string): ValidationResult {
  const code = rawInputCode.trim().toUpperCase().replace(/\s+/g, '');

  if (!code) {
    return { success: false, message: 'Por favor, introduce un código de activación.' };
  }

  const { monthlyIndex, annualIndex, usedCodes } = getStoredCodeState();
  const currentMonthlyCode = getMonthlyCodeForIndex(monthlyIndex);
  const currentAnnualCode = getAnnualCodeForIndex(annualIndex);

  // 1. Check if code was already used
  if (usedCodes.includes(code)) {
    return {
      success: false,
      message: `El código "${code}" ya ha sido utilizado previamente y no es válido de nuevo.`,
    };
  }

  // 2. Check match with current Monthly code (BIZUMPRO01, BIZUMPRO03, etc)
  if (code === currentMonthlyCode) {
    const nextCode = getMonthlyCodeForIndex(monthlyIndex + 1);
    const updatedUsed = [...usedCodes, code];
    const newMonthlyIndex = monthlyIndex + 1;

    localStorage.setItem(STORAGE_KEY_USED_CODES, JSON.stringify(updatedUsed));
    localStorage.setItem(STORAGE_KEY_MONTHLY_INDEX, String(newMonthlyIndex));

    return {
      success: true,
      message: `¡Código ${code} activado con éxito! Plan Mensual (5€/mes) activado. Próximo código único: ${nextCode}.`,
      plan: 'monthly',
      codeUsed: code,
      nextExpectedCode: nextCode,
      credits: 500,
    };
  }

  // 3. Check match with current Annual code (PRO202601, PRO202604, etc)
  if (code === currentAnnualCode) {
    const nextCode = getAnnualCodeForIndex(annualIndex + 1);
    const updatedUsed = [...usedCodes, code];
    const newAnnualIndex = annualIndex + 1;

    localStorage.setItem(STORAGE_KEY_USED_CODES, JSON.stringify(updatedUsed));
    localStorage.setItem(STORAGE_KEY_ANNUAL_INDEX, String(newAnnualIndex));

    return {
      success: true,
      message: `¡Código ${code} activado con éxito! Plan Anual (60€/año) activado. Próximo código único: ${nextCode}.`,
      plan: 'annual',
      codeUsed: code,
      nextExpectedCode: nextCode,
      credits: 1000,
    };
  }

  // 4. Check if user typed a valid pattern code from the sequence (e.g. they received a future sequence code directly)
  // Monthly pattern check: BIZUMPRO + odd number
  if (code.startsWith('BIZUMPRO')) {
    const numPart = parseInt(code.replace('BIZUMPRO', ''), 10);
    if (!isNaN(numPart) && numPart >= 1 && numPart % 2 === 1) {
      // Find what index this corresponds to: num = 1 + index * 2 => index = (num - 1) / 2
      const targetIdx = (numPart - 1) / 2;
      const updatedUsed = [...usedCodes, code];
      const newMonthlyIndex = Math.max(monthlyIndex, targetIdx + 1);
      const nextCode = getMonthlyCodeForIndex(newMonthlyIndex);

      localStorage.setItem(STORAGE_KEY_USED_CODES, JSON.stringify(updatedUsed));
      localStorage.setItem(STORAGE_KEY_MONTHLY_INDEX, String(newMonthlyIndex));

      return {
        success: true,
        message: `¡Código ${code} verificado y activado! Plan Mensual (5€/mes) activado. Próximo código activo: ${nextCode}.`,
        plan: 'monthly',
        codeUsed: code,
        nextExpectedCode: nextCode,
        credits: 500,
      };
    }
  }

  // Annual pattern check: PRO2026 + number where (num - 1) % 3 === 0
  if (code.startsWith('PRO2026')) {
    const numPart = parseInt(code.replace('PRO2026', ''), 10);
    if (!isNaN(numPart) && numPart >= 1 && (numPart - 1) % 3 === 0) {
      const targetIdx = (numPart - 1) / 3;
      const updatedUsed = [...usedCodes, code];
      const newAnnualIndex = Math.max(annualIndex, targetIdx + 1);
      const nextCode = getAnnualCodeForIndex(newAnnualIndex);

      localStorage.setItem(STORAGE_KEY_USED_CODES, JSON.stringify(updatedUsed));
      localStorage.setItem(STORAGE_KEY_ANNUAL_INDEX, String(newAnnualIndex));

      return {
        success: true,
        message: `¡Código ${code} verificado y activado! Plan Anual (60€/año) activado. Próximo código activo: ${nextCode}.`,
        plan: 'annual',
        codeUsed: code,
        nextExpectedCode: nextCode,
        credits: 1000,
      };
    }
  }

  // 5. Check fallback general promo codes (e.g. VIPPRO, BIZUMPRO, PRO2026 without numbers)
  if (['BIZUMPRO', 'PRO2026', 'COACHMIND', 'VIPPRO', 'PRO5'].includes(code)) {
    const isAnnual = code.includes('2026') || code.includes('ANNUAL') || code.includes('VIP');
    const plan = isAnnual ? 'annual' : 'monthly';
    const credits = isAnnual ? 1000 : 500;
    const updatedUsed = [...usedCodes, code];

    localStorage.setItem(STORAGE_KEY_USED_CODES, JSON.stringify(updatedUsed));

    return {
      success: true,
      message: `¡Código promocional ${code} aceptado! Plan ${isAnnual ? 'Anual' : 'Mensual'} activado.`,
      plan,
      codeUsed: code,
      credits,
    };
  }

  // If code is completely unrecognized or out of sequence:
  return {
    success: false,
    message: `Código no válido o caducado. El código de 1 solo uso activo para Plan Mensual (5€) es "${currentMonthlyCode}" y para Plan Anual (60€) es "${currentAnnualCode}".`,
  };
}
