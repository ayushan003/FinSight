"use client";

import React from "react";
import MDEditor from "@uiw/react-md-editor";

const ReportPreview = ({ content }) => {
  return (
    <div className="py-4" data-color-mode="dark">
      <MDEditor.Markdown source={content} style={{ padding: "1.5rem", background: "transparent" }} />
    </div>
  );
};

export default ReportPreview;
