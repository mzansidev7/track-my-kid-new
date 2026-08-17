// Utility functions to validate South African ID numbers
export type SaIdValidation = {
  valid: boolean;
  dob?: string; // ISO date string YYYY-MM-DD
  gender?: "M" | "F";
  citizenship?: "SA" | "Permanent Resident" | "Unknown";
  checksumValid: boolean;
  reasons?: string[];
};

const onlyDigits = (s: string) => s.replace(/\D/g, "");

const computeLuhnCheckDigit = (digits12: string) => {
  // South African ID checksum algorithm:
  // - Sum digits in odd positions (1,3,5,7,9,11) from the LEFT
  // - Concatenate digits in even positions (2,4,6,8,10,12) from the LEFT into a number,
  //   multiply by 2, then sum the digits of the result.
  // - Add the two sums and compute (10 - (total % 10)) % 10
  const nums = digits12.split("").map((d) => parseInt(d, 10));
  if (nums.length !== 12 || nums.some((n) => Number.isNaN(n))) return 0;

  let sumOdd = 0;
  const evenChars: string[] = [];
  for (let i = 0; i < nums.length; i++) {
    // positions are 0-based index; odd positions (1,3,...) are indexes 0,2,...
    if (i % 2 === 0) {
      sumOdd += nums[i];
    } else {
      evenChars.push(String(nums[i]));
    }
  }

  const evenNumber = parseInt(evenChars.join("") || "0", 10);
  const doubled = evenNumber * 2;
  const sumDoubledDigits = String(doubled)
    .split("")
    .reduce((acc, ch) => acc + parseInt(ch, 10), 0);

  const total = sumOdd + sumDoubledDigits;
  const check = (10 - (total % 10)) % 10;
  return check;
};

export function validateSouthAfricanId(id: string): SaIdValidation {
  const cleaned = onlyDigits(id);
  const reasons: string[] = [];
  if (cleaned.length !== 13) {
    reasons.push("ID must contain 13 digits");
    return { valid: false, checksumValid: false, reasons };
  }

  // DOB: first 6 digits YYMMDD
  const yy = cleaned.slice(0, 2);
  const mm = cleaned.slice(2, 4);
  const dd = cleaned.slice(4, 6);
  const twoDigitYear = parseInt(yy, 10);
  const month = parseInt(mm, 10);
  const day = parseInt(dd, 10);

  // Determine century: if YY <= currentYear%100 => 2000s else 1900s
  const currentYear = new Date().getFullYear() % 100;
  const century = twoDigitYear <= currentYear ? 2000 : 1900;
  const year = century + twoDigitYear;

  const dobIso = `${year.toString().padStart(4, "0")}-${mm}-${dd}`;
  const dob = new Date(dobIso);
  if (isNaN(dob.getTime()) || dob.getFullYear() !== year || dob.getMonth() + 1 !== month || dob.getDate() !== day) {
    reasons.push("Invalid date of birth in ID");
  }

  // Gender: digits 7-10 (indexes 6-9)
  const genderNum = parseInt(cleaned.slice(6, 10), 10);
  const gender = Number.isFinite(genderNum) ? (genderNum >= 5000 ? "M" : "F") : undefined;

  // Citizenship: digit 11 (index 10)
  const cit = cleaned.charAt(10);
  const citizenship = cit === "0" ? "SA" : cit === "1" ? "Permanent Resident" : "Unknown";

  // Checksum (Luhn on first 12 digits)
  const first12 = cleaned.slice(0, 12);
  const providedCheck = parseInt(cleaned.charAt(12), 10);
  const computed = computeLuhnCheckDigit(first12);
  const checksumValid = providedCheck === computed;
  if (!checksumValid) reasons.push("Checksum mismatch");

  const valid = reasons.length === 0;
  return {
    valid,
    dob: dobIso,
    gender: gender as "M" | "F" | undefined,
    citizenship,
    checksumValid,
    reasons,
  };
}

export function extractDobFromId(id: string): string | null {
  const v = validateSouthAfricanId(id);
  return v.dob || null;
}

export default validateSouthAfricanId;
