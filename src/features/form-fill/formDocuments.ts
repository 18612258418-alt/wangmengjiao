export type FormDocId = "integrity";

export type FormFieldType = "text" | "textarea" | "signature" | "photo" | "checkbox";

export interface FormFieldDef {
  id: string;
  label: string;
  type: FormFieldType;
  placeholder?: string;
  staticText?: string;
  rows?: number;
  memoryKey?: string;
}

export interface FormDocumentDef {
  id: FormDocId;
  title: string;
  subtitle: string;
  preamble: string[];
  fields: FormFieldDef[];
}

export const INTEGRITY_FORM: FormDocumentDef = {
  id: "integrity",
  title: "学位论文诚信申明书",
  subtitle: "（学生提交版 · 模拟表格）",
  preamble: [
    "本人郑重声明：所呈交的学位论文《________》是在指导教师指导下独立完成的研究成果。",
    "除文中已注明引用的内容外，本论文不包含任何他人已经发表或撰写过的研究成果。",
    "对本文的研究做出重要贡献的个人和集体，均已在文中以明确方式标明。",
  ],
  fields: [
    { id: "thesisTitle", label: "论文题目", type: "text", placeholder: "填写论文完整题目", memoryKey: "thesisTitle" },
    { id: "studentId", label: "学号", type: "text", placeholder: "10 位学号", memoryKey: "studentId" },
    { id: "college", label: "学院", type: "text", placeholder: "如：理学院", memoryKey: "college" },
    { id: "major", label: "专业", type: "text", placeholder: "如：应用物理学", memoryKey: "major" },
    { id: "advisor", label: "指导教师", type: "text", placeholder: "导师姓名", memoryKey: "advisor" },
    { id: "idPhoto", label: "照片", type: "photo", memoryKey: "idPhoto" },
    { id: "signature", label: "签名", type: "signature", memoryKey: "signature" },
    { id: "signDate", label: "声明日期", type: "text", placeholder: "年 月 日", memoryKey: "signDate" },
    {
      id: "integrityAck",
      label: "诚信承诺",
      type: "checkbox",
      staticText: "本人已阅读并遵守学校学位论文撰写规范与学术诚信要求，如有不实，愿承担相应责任。",
    },
  ],
};

/** @deprecated use INTEGRITY_FORM */
export const FORM_DOCUMENTS = [INTEGRITY_FORM];

export function memoryFillableFieldIds(doc: FormDocumentDef): string[] {
  return doc.fields.filter(f => f.memoryKey && f.type !== "checkbox").map(f => f.id);
}
