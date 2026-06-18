import { Badge } from "./Badge";

export default function PersonTable({ onSelectPerson, persons, selectedPersonId }) {
  const columns = ["ID", "要員名", "所属会社", "状態", "希望単価", "稼働開始", "スキル", "作成日"];

  return (
    <div className="table-wrap">
      <table className="project-table person-table">
        <thead>
          <tr>
            {columns.map((column, columnIndex) => (
              <th key={`${column}-${columnIndex}`}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {persons.map((person, personIndex) => {
            const personKey = person.dbId ?? person.id ?? personIndex;

            return (
              <tr className={selectedPersonId === person.id ? "selected" : ""} key={personKey} onClick={() => onSelectPerson?.(person)}>
                <td className="id-cell">{person.id}</td>
                <td className="title-cell" title={person.name}>
                  <div className="title-with-badges">
                    <span>{person.name}</span>
                    {person.needsReview ? <Badge tone="danger">要確認</Badge> : null}
                  </div>
                </td>
                <td className="company-cell" title={person.company}>
                  {person.company}
                </td>
                <td>{person.status}</td>
                <td className={person.unitPrice !== "未定" ? "price-cell" : ""}>{person.unitPrice}</td>
                <td>{person.availableFrom}</td>
                <td title={person.skills}>{person.skills}</td>
                <td>{person.createdAt}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
