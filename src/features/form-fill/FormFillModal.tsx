import { useCallback, useEffect, useMemo, useState } from "react";
import { Database, Sparkles, X } from "lucide-react";
import { usePenContext } from "../pen-context";
import {
  INTEGRITY_FORM,
  memoryFillableFieldIds,
  type FormFieldDef,
} from "./formDocuments";
import { MemoryProfileModal } from "./MemoryProfileModal";
import { ThesisContentView } from "./ThesisContentView";
import { HandwrittenSignature, isLegacySignatureDataUrl } from "./HandwrittenSignature";
import { IdPhoto, ID_PHOTO_WIDTH_PX } from "./IdPhoto";
import { markPhotoFilled, markSignatureFilled } from "./signatureGenerator";
import {
  loadFormProfile,
  profileKeyForField,
  profileValueForField,
  saveFieldToProfile,
  saveFormProfile,
  canFillPhotoFromMemory,
  signatureNameForProfile,
  type FormProfile,
} from "./formProfileStore";

interface FormFillModalProps {
  onClose: () => void;
}

type FieldValues = Record<string, string | boolean | null>;

const DOC_ID = "integrity" as const;

const BASIC_FIELD_IDS = ["thesisTitle", "studentId", "college", "major", "advisor"] as const;

function fieldKey(fieldId: string) {
  return `${DOC_ID}:${fieldId}`;
}

function emptyFormValues(): FieldValues {
  const v: FieldValues = {};
  for (const f of INTEGRITY_FORM.fields) {
    const k = fieldKey(f.id);
    if (f.type === "checkbox") v[k] = false;
    else if (f.type === "signature" || f.type === "photo") v[k] = null;
    else v[k] = "";
  }
  return v;
}

function isEmptyValue(field: FormFieldDef, val: FieldValues[string]): boolean {
  if (field.type === "signature" || field.type === "photo") return val !== true;
  if (field.type === "checkbox") return val !== true;
  return !val || (typeof val === "string" && !val.trim());
}

export function FormFillModal({ onClose }: FormFillModalProps) {
  const { activatePen } = usePenContext();
  const [profile, setProfile] = useState<FormProfile>(() => {
    const loaded = loadFormProfile();
    if (isLegacySignatureDataUrl(loaded.signatureDataUrl)) {
      return saveFormProfile({ signatureDataUrl: null });
    }
    return loaded;
  });
  const [values, setValues] = useState<FieldValues>(() => emptyFormValues());
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const [promptDismissed, setPromptDismissed] = useState(false);
  const [showMemoryModal, setShowMemoryModal] = useState(false);

  const fillableIds = useMemo(() => memoryFillableFieldIds(INTEGRITY_FORM), []);

  const memoryAvailableCount = useMemo(() => {
    const fillable = fillableIds.filter(fieldId => {
      const field = INTEGRITY_FORM.fields.find(f => f.id === fieldId);
      const k = fieldKey(fieldId);
      if (!field || !isEmptyValue(field, values[k])) return false;
      if (fieldId === "signature") return Boolean(signatureNameForProfile(profile));
      if (fieldId === "idPhoto") return canFillPhotoFromMemory(profile);
      return Boolean(profileValueForField(fieldId, profile));
    }).length;
    const ackPending = values[fieldKey("integrityAck")] !== true ? 1 : 0;
    return fillable + ackPending;
  }, [fillableIds, values, profile]);

  const showFillPrompt = memoryAvailableCount > 0 && !promptDismissed;

  const displayProfile = useMemo((): FormProfile => ({
    ...profile,
    thesisTitle: (values[fieldKey("thesisTitle")] as string)?.trim() || profile.thesisTitle,
    name: profile.name,
    studentId: (values[fieldKey("studentId")] as string)?.trim() || profile.studentId,
    college: (values[fieldKey("college")] as string)?.trim() || profile.college,
    major: (values[fieldKey("major")] as string)?.trim() || profile.major,
    advisor: (values[fieldKey("advisor")] as string)?.trim() || profile.advisor,
  }), [profile, values]);

  const thesisTitleFilled = displayProfile.thesisTitle;

  useEffect(() => {
    activatePen();
  }, [activatePen]);

  const syncFieldToMemory = useCallback((fieldId: string, value: string, base: FormProfile): FormProfile => {
    if (!profileKeyForField(fieldId)) return base;
    if (fieldId === "signature") return base;
    if (fieldId === "idPhoto") return base;
    return saveFieldToProfile(fieldId, value) ?? base;
  }, []);

  const applyValue = useCallback((fieldId: string, value: string) => {
    const field = INTEGRITY_FORM.fields.find(f => f.id === fieldId);
    if (!field || field.type === "checkbox") return;

    const k = fieldKey(fieldId);
    setValues(v => ({ ...v, [k]: value }));
    setApplied(prev => new Set(prev).add(k));
    setProfile(prev => syncFieldToMemory(fieldId, value, prev));
  }, [syncFieldToMemory]);

  const fillSignature = useCallback(() => {
    const k = fieldKey("signature");
    setValues(v => ({ ...v, [k]: markSignatureFilled() }));
    setApplied(prev => new Set(prev).add(k));
    setProfile(prev => saveFormProfile({ signatureDataUrl: null }));
  }, []);

  const fillPhoto = useCallback(() => {
    const k = fieldKey("idPhoto");
    setValues(v => ({ ...v, [k]: markPhotoFilled() }));
    setApplied(prev => new Set(prev).add(k));
    setProfile(prev => saveFormProfile({ photoDataUrl: null }));
  }, []);

  const fillAllFromMemory = useCallback(() => {
    for (const fieldId of fillableIds) {
      const field = INTEGRITY_FORM.fields.find(f => f.id === fieldId);
      const k = fieldKey(fieldId);
      if (!field || !isEmptyValue(field, values[k])) continue;

      if (fieldId === "signature") {
        fillSignature();
        continue;
      }

      if (fieldId === "idPhoto") {
        fillPhoto();
        continue;
      }

      const value = profileValueForField(fieldId, profile);
      if (!value) continue;
      applyValue(fieldId, value);
    }

    const ackKey = fieldKey("integrityAck");
    if (values[ackKey] !== true) {
      setValues(v => ({ ...v, [ackKey]: true }));
      setApplied(prev => new Set(prev).add(ackKey));
    }

    setPromptDismissed(true);
  }, [fillableIds, values, profile, applyValue, fillSignature, fillPhoto]);

  const persistOnBlur = (fieldId: string) => {
    if (!profileKeyForField(fieldId)) return;
    if (fieldId === "signature") return;
    if (fieldId === "idPhoto") return;
    const k = fieldKey(fieldId);
    const val = values[k];
    if (typeof val === "string" && val.trim()) {
      setProfile(prev => saveFieldToProfile(fieldId, val) ?? prev);
    }
  };

  const boxCls = (k: string, dashed = false) => {
    const border = dashed ? "border-2 border-dashed" : "border";
    if (focusedKey === k) return `${border} border-[#4D5CFF] bg-[#F8F9FF]`;
    return `${border} border-[#EAEDF2] bg-white`;
  };

  const inputCls = (k: string, field: FormFieldDef) => {
    const base = "w-full rounded-xl border px-3 outline-none transition-colors text-[14px] text-[#020418]";
    const pad = field.type === "textarea" ? "py-2.5 leading-relaxed resize-none" : "py-2.5";
    return `${base} ${pad} ${boxCls(k)}`;
  };

  const renderTextField = (field: FormFieldDef) => {
    const k = fieldKey(field.id);
    return (
      <div key={k} className="mb-4">
        <p className="text-[13px] text-[#41464F] mb-1.5" style={{ fontWeight: 600 }}>{field.label}</p>
        <input
          className={inputCls(k, field)}
          placeholder={field.placeholder}
          value={(values[k] as string) ?? ""}
          onFocus={() => setFocusedKey(k)}
          onBlur={() => persistOnBlur(field.id)}
          onChange={e => {
            setValues(v => ({ ...v, [k]: e.target.value }));
            setApplied(prev => {
              const next = new Set(prev);
              next.delete(k);
              return next;
            });
          }}
        />
      </div>
    );
  };

  const renderCheckboxField = (field: FormFieldDef) => {
    const k = fieldKey(field.id);
    return (
      <div key={k} className="mb-4">
        <p className="text-[13px] text-[#41464F] mb-1.5" style={{ fontWeight: 600 }}>{field.label}</p>
        <label className={`flex items-start gap-2.5 cursor-pointer rounded-xl border px-3 py-3 ${boxCls(k)}`}>
          <input
            type="checkbox"
            checked={values[k] === true}
            onChange={e => {
              setValues(v => ({ ...v, [k]: e.target.checked }));
              if (e.target.checked) {
                setApplied(prev => new Set(prev).add(k));
              } else {
                setApplied(prev => {
                  const next = new Set(prev);
                  next.delete(k);
                  return next;
                });
              }
            }}
            className="mt-1 accent-[#4D5CFF]"
          />
          <span className="text-[13px] text-[#41464F] leading-relaxed">{field.staticText}</span>
        </label>
      </div>
    );
  };

  const renderPhotoSignatureRow = () => {
    const photoKey = fieldKey("idPhoto");
    const signatureKey = fieldKey("signature");
    const signDateKey = fieldKey("signDate");
    const signDateField = INTEGRITY_FORM.fields.find(f => f.id === "signDate")!;
    const photoField = INTEGRITY_FORM.fields.find(f => f.id === "idPhoto")!;
    const signatureField = INTEGRITY_FORM.fields.find(f => f.id === "signature")!;

    return (
      <div key="photo-signature-row" className="mb-4 flex gap-5 items-stretch">
        <div className="flex-shrink-0 flex flex-col" style={{ width: ID_PHOTO_WIDTH_PX + 16 }}>
          <p className="text-[13px] text-[#41464F] mb-1.5" style={{ fontWeight: 600 }}>{photoField.label}</p>
          <button
            type="button"
            className={`flex-1 min-h-[186px] rounded-xl flex items-center justify-center overflow-hidden p-1.5 transition-colors ${boxCls(photoKey, true)}`}
            onClick={() => {
              setFocusedKey(photoKey);
              if (values[photoKey] !== true) fillPhoto();
            }}
          >
            {values[photoKey] === true ? (
              <IdPhoto />
            ) : (
              <span className="text-[12px] text-[#7B8291] px-2 text-center">点击填入照片</span>
            )}
          </button>
        </div>

        <div className="flex-1 min-w-0 flex flex-col">
          <p className="text-[13px] text-[#41464F] mb-1.5" style={{ fontWeight: 600 }}>{signatureField.label}</p>
          <div className="flex-1 min-h-[186px] flex flex-col">
            <button
              type="button"
              className={`flex-1 min-h-[80px] rounded-xl flex items-center justify-center transition-colors ${boxCls(signatureKey, true)}`}
              onClick={() => {
                setFocusedKey(signatureKey);
                if (values[signatureKey] !== true) fillSignature();
              }}
            >
              {values[signatureKey] === true ? (
                <HandwrittenSignature name={displayProfile.name} />
              ) : (
                <span className="text-[13px] text-[#7B8291]">点击填入签名</span>
              )}
            </button>

            <div className="mt-3 flex-shrink-0">
              <p className="text-[13px] text-[#41464F] mb-1.5" style={{ fontWeight: 600 }}>声明日期</p>
              <input
                className={inputCls(signDateKey, signDateField)}
                placeholder={signDateField.placeholder}
                value={(values[signDateKey] as string) ?? ""}
                onFocus={() => setFocusedKey(signDateKey)}
                onBlur={() => persistOnBlur("signDate")}
                onChange={e => {
                  setValues(v => ({ ...v, [signDateKey]: e.target.value }));
                  setApplied(prev => {
                    const next = new Set(prev);
                    next.delete(signDateKey);
                    return next;
                  });
                }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const basicFields = INTEGRITY_FORM.fields.filter(f => (BASIC_FIELD_IDS as readonly string[]).includes(f.id));
  const integrityField = INTEGRITY_FORM.fields.find(f => f.id === "integrityAck")!;

  return (
    <div className="fixed inset-0 z-[600] flex flex-col bg-[#F5F6FA]">
      <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-[#EAEDF2] flex-shrink-0 gap-3">
        <button type="button" onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[#F5F6FA] text-[#7B8291] flex-shrink-0">
          <X size={17} />
        </button>
        <p className="text-[15px] text-[#020418] truncate flex-1 text-center" style={{ fontWeight: 700 }}>
          表单智能填充
        </p>
        <button
          type="button"
          onClick={() => setShowMemoryModal(true)}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[#F5F6FA] text-[#4D5CFF] flex-shrink-0"
          title="管理记忆库"
        >
          <Database size={17} />
        </button>
      </div>

      {showFillPrompt && (
        <div className="px-5 py-2.5 bg-[#EEF0FF] border-b border-[#4D5CFF]/15 flex-shrink-0">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Sparkles size={15} className="text-[#4D5CFF] flex-shrink-0" />
              <p className="text-[13px] text-[#020418] truncate">
                检测到记忆库有 <span style={{ fontWeight: 600 }}>{memoryAvailableCount}</span> 项相关内容，是否一键填充？
              </p>
            </div>
            <button
              type="button"
              onClick={fillAllFromMemory}
              className="px-3.5 py-1.5 rounded-xl bg-[#4D5CFF] text-white text-[12px] flex-shrink-0"
              style={{ fontWeight: 600 }}
            >
              一键填充
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        <article className="max-w-2xl mx-auto bg-white rounded-2xl border border-[#EAEDF2] shadow-sm overflow-hidden">
          <div className="px-8 pt-8 pb-2 text-center border-b border-[#EAEDF2]/80">
            <h1 className="text-[18px] text-[#020418] leading-snug" style={{ fontWeight: 700 }}>
              {INTEGRITY_FORM.title}
            </h1>
          </div>

          <div className="px-8 py-6">
            {INTEGRITY_FORM.preamble.map((para, i) => (
              <p key={i} className="text-[13px] text-[#41464F] leading-[1.85] mb-3 indent-[2em]">
                {para.replace(
                  "《________》",
                  thesisTitleFilled ? `《${thesisTitleFilled}》` : "《________》",
                )}
              </p>
            ))}
            <div className="my-6 h-px bg-[#EAEDF2]" />
            {basicFields.map(renderTextField)}
            {renderPhotoSignatureRow()}
            {renderCheckboxField(integrityField)}
          </div>
        </article>

        <ThesisContentView profile={displayProfile} />
      </div>

      {showMemoryModal && (
        <MemoryProfileModal
          profile={profile}
          onClose={() => setShowMemoryModal(false)}
          onSaved={next => {
            setProfile(next);
            setPromptDismissed(false);
          }}
        />
      )}
    </div>
  );
}
