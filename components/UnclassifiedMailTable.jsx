import { Badge } from "./Badge";

export default function UnclassifiedMailTable({ mails, onSelectMail, selectedMailId }) {
  const columns = ["ID", "件名", "送信元会社", "担当者 / 送信者", "受信日時", "分類", "除外状態", "要確認"];

  return (
    <div className="table-wrap">
      <table className="project-table unclassified-mail-table">
        <thead>
          <tr>
            {columns.map((column, columnIndex) => (
              <th key={`${column}-${columnIndex}`}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {mails.map((mail, mailIndex) => {
            const mailKey = mail.dbId ?? mail.id ?? mailIndex;

            return (
              <tr className={selectedMailId === mail.id ? "selected" : ""} key={mailKey} onClick={() => onSelectMail?.(mail)}>
                <td className="id-cell">{mail.id}</td>
                <td className="title-cell" title={mail.subject}>
                  <div className="title-with-badges">
                    <span>{mail.subject}</span>
                    {mail.needsReview ? <Badge tone="danger">要確認</Badge> : null}
                  </div>
                </td>
                <td className="company-cell" title={mail.senderCompany}>
                  {mail.senderCompany}
                </td>
                <td title={mail.sender}>{mail.sender}</td>
                <td>{mail.receivedAt}</td>
                <td>
                  <Badge tone="outline">{mail.classification}</Badge>
                </td>
                <td>{mail.isExcluded ? <Badge tone="danger">除外</Badge> : <Badge>通常</Badge>}</td>
                <td>{mail.needsReview ? <Badge tone="danger">要確認</Badge> : "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
