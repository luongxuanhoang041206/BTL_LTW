export function Title({ text1, text2 }) {
  return (
    <div className="admin-title-wrap">
      <h1 className="admin-page-title">
        {text1} {text2 && <span>{text2}</span>}
      </h1>
    </div>
  );
}
