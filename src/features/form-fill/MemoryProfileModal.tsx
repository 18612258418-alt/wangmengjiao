import { useState } from "react";
import { RotateCcw, Save, Trash2, X } from "lucide-react";
import {
  PROFILE_EDIT_FIELDS,
  resetFormProfile,
  saveFormProfile,
  signatureNameForProfile,
  type FormProfile,
} from "./formProfileStore";
import { HandwrittenSignature } from "./HandwrittenSignature";
import { IdPhoto } from "./IdPhoto";

export function MemoryProfileModal({
  profile,
  onClose,
  onSaved,
}: {
  profile: FormProfile;
  onClose: () => void;
  onSaved: (next: FormProfile) => void;
}) {
  const [draft, setDraft] = useState<FormProfile>({ ...profile });

  const handleSave = () => {
    const next = saveFormProfile(draft);
    onSaved(next);
    onClose();
  };

  const handleReset = () => {
    if (!window.confirm("确定恢复记忆库为默认内容？自定义修改将丢失。")) return;
    const next = resetFormProfile();
    setDraft({ ...next });
    onSaved(next);
  };

  const clearSignature = () => {
    setDraft(d => ({ ...d, signatureDataUrl: null }));
  };

  const clearPhoto = () => {
    setDraft(d => ({ ...d, photoDataUrl: null }));
  };

  return (
    <div className="fixed inset-0 z-[620] flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4">
      <div
        className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[88vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EAEDF2] flex-shrink-0">
          <p className="text-[16px] text-[#020418]" style={{ fontWeight: 700 }}>管理记忆库</p>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[#F5F6FA] text-[#7B8291]"
          >
            <X size={17} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <p className="text-[12px] text-[#7B8291] leading-relaxed">
            修改后保存，下次「全部填充」将使用更新后的内容。
          </p>

          {PROFILE_EDIT_FIELDS.map(({ key, label, multiline }) => (
            <label key={key} className="block">
              <span className="text-[13px] text-[#41464F] mb-1.5 block" style={{ fontWeight: 600 }}>{label}</span>
              {multiline ? (
                <textarea
                  className="w-full rounded-xl border border-[#EAEDF2] px-3 py-2.5 text-[14px] outline-none focus:border-[#4D5CFF] focus:bg-[#F8F9FF] resize-none leading-relaxed"
                  rows={3}
                  value={(draft[key] as string) ?? ""}
                  onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))}
                />
              ) : (
                <input
                  className="w-full rounded-xl border border-[#EAEDF2] px-3 py-2.5 text-[14px] outline-none focus:border-[#4D5CFF] focus:bg-[#F8F9FF]"
                  value={(draft[key] as string) ?? ""}
                  onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))}
                />
              )}
            </label>
          ))}

          <div>
            <span className="text-[13px] text-[#41464F] mb-1.5 block" style={{ fontWeight: 600 }}>照片缓存</span>
            <div className="flex items-center gap-3 rounded-xl border border-[#EAEDF2] px-3 py-3 bg-[#FAFBFC]">
              <div className="flex-1 flex justify-center py-1">
                <IdPhoto />
              </div>
              <button
                type="button"
                onClick={clearPhoto}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] text-[#FF5A5F] hover:bg-[#FFF1F1]"
                style={{ fontWeight: 600 }}
              >
                <Trash2 size={13} />
                删除
              </button>
            </div>
          </div>

          <div>
            <span className="text-[13px] text-[#41464F] mb-1.5 block" style={{ fontWeight: 600 }}>签名缓存</span>
            <div className="flex items-center gap-3 rounded-xl border border-[#EAEDF2] px-3 py-3 bg-[#FAFBFC]">
              <div className="flex-1 flex justify-center py-1">
                <HandwrittenSignature name={signatureNameForProfile(draft)} />
              </div>
              <button
                type="button"
                onClick={clearSignature}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] text-[#FF5A5F] hover:bg-[#FFF1F1]"
                style={{ fontWeight: 600 }}
              >
                <Trash2 size={13} />
                删除
              </button>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-[#EAEDF2] flex gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#F5F6FA] text-[#41464F] text-[13px]"
            style={{ fontWeight: 600 }}
          >
            <RotateCcw size={14} />
            恢复默认
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#4D5CFF] text-white text-[13px]"
            style={{ fontWeight: 600 }}
          >
            <Save size={14} />
            保存记忆库
          </button>
        </div>
      </div>
    </div>
  );
}
