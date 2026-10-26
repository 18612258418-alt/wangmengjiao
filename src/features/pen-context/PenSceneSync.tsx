import { useEffect } from "react";
import { usePenContext } from "./usePenContext";

export function PenSceneSync({
  annotationType,
  pdfReaderFile,
  showVoice,
  showFormFill,
}: {
  annotationType: string | null;
  pdfReaderFile: File | null;
  showVoice: boolean;
  showFormFill: boolean;
}) {
  const { setScene } = usePenContext();

  useEffect(() => {
    if (showFormFill) {
      setScene("form-fill");
    } else if (annotationType) {
      setScene("annotation", { annotationType });
    } else if (pdfReaderFile) {
      setScene("pdf", { fileName: pdfReaderFile.name });
    } else if (showVoice) {
      setScene("voice");
    } else {
      setScene("idle");
    }
  }, [annotationType, pdfReaderFile, showVoice, showFormFill, setScene]);

  return null;
}
