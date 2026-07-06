import { useState } from "react";
import { Routes, Route, useNavigate, Navigate } from "react-router-dom";
import { HistoryFallback } from "./useAppNavigation";
import { supabase, VIDEOS_BUCKET } from "./supabase";
import { styles } from "./styles";
import IntroScreen from "./screens/IntroScreen";
import QuestionScreen from "./screens/QuestionScreen";
import RecordScreen from "./screens/RecordScreen";
import EmailScreen from "./screens/EmailScreen";
import UploadingScreen from "./screens/UploadingScreen";
import SuccessScreen from "./screens/SuccessScreen";

export default function App() {
  const navigate = useNavigate();
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");

  const handleVideoReady = (blob) => {
    setRecordedBlob(blob);
    navigate("/email");
  };

  const handleEmail = (emailValue) => {
    navigate("/uploading");
    uploadVideo(recordedBlob, emailValue);
  };

  const uploadVideo = async (blob, emailValue) => {
    setUploadProgress(0);
    setUploadError("");

    let sim = 0;
    const simInterval = setInterval(() => {
      sim = Math.min(sim + Math.random() * 5, 80);
      setUploadProgress(sim);
    }, 350);

    try {
      const filename = `testimonial-${Date.now()}-${Math.round(Math.random() * 1e9)}.webm`;

      const { error: storageError } = await supabase.storage
        .from(VIDEOS_BUCKET)
        .upload(filename, blob, {
          contentType: "video/webm",
          upsert: false,
          onUploadProgress: (progress) => {
            clearInterval(simInterval);
            setUploadProgress((progress.loaded / progress.total) * 85);
          },
        });

      if (storageError) throw storageError;

      clearInterval(simInterval);
      setUploadProgress(90);

      const { data: { publicUrl } } = supabase.storage
        .from(VIDEOS_BUCKET)
        .getPublicUrl(filename);

      const { error: dbError } = await supabase
        .from("testimonials")
        .insert({ email: emailValue, filename, video_url: publicUrl });

      if (dbError) throw dbError;

      setUploadProgress(100);
      setTimeout(() => navigate("/success", { replace: true }), 400);
    } catch (err) {
      clearInterval(simInterval);
      setUploadError(err.message || "Upload failed. Please try again.");
      navigate("/email");
    }
  };

  const handleReset = () => {
    setRecordedBlob(null);
    setUploadProgress(0);
    setUploadError("");
    navigate("/");
  };

  return (
    <div style={styles.app}>
      <HistoryFallback />
      {/* CiscoSansTT loaded via @font-face in index.css */}
      <Routes>
        <Route path="/" element={<IntroScreen onNext={() => navigate("/question")} />} />
        <Route path="/question" element={<QuestionScreen onStart={() => navigate("/record")} />} />
        <Route path="/record" element={<RecordScreen onNext={handleVideoReady} />} />
        <Route path="/email" element={<EmailScreen onNext={handleEmail} error={uploadError} />} />
        <Route path="/uploading" element={<UploadingScreen progress={uploadProgress} />} />
        <Route path="/success" element={<SuccessScreen onReset={handleReset} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
