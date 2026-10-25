type NoChangesScreenProps = {
  copyStatus: string
  onBack: () => void
  onCopy: () => void
}

export function NoChangesScreen({ copyStatus, onBack, onCopy }: NoChangesScreenProps) {
  return (
    <main className="page empty-page">
      <section className="empty-state" aria-labelledby="empty-title">
        <div className="empty-state__icon" aria-hidden="true">✓</div>
        <div>
          <h1 id="empty-title">Изменений не найдено</h1>
          <p>Текст уже соответствует активным типографическим правилам.</p>
        </div>
        <div className="empty-actions">
          <button className="button button--secondary" type="button" onClick={onBack}>Вернуться к редактированию</button>
          <button className="button button--primary" type="button" onClick={onCopy}>Копировать текст</button>
          <button className="button button--secondary" type="button" disabled title="Экспорт файлов не входит в первую версию MVP">Экспортировать</button>
        </div>
        <p className="copy-status" aria-live="polite">{copyStatus}</p>
      </section>
    </main>
  )
}
