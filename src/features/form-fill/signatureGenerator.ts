import { HandwrittenSignature, isLegacySignatureDataUrl } from "./HandwrittenSignature";

export { HandwrittenSignature, isLegacySignatureDataUrl };

/** 标记签名已填写（展示由 HandwrittenSignature 组件负责） */
export function markSignatureFilled(): true {
  return true;
}

/** 标记照片已填写（展示由 IdPhoto 组件负责） */
export function markPhotoFilled(): true {
  return true;
}
