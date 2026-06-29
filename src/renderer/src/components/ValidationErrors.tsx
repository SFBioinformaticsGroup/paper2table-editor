interface Props {
  fileName: string
  errors: string[]
}

export function ValidationErrors({ fileName, errors }: Props) {
  return (
    <details className="validation-errors" open>
      <summary>
        Schema validation errors in <code>{fileName}</code>{' '}
        ({errors.length})
      </summary>
      <ul>
        {errors.map((msg, i) => (
          <li key={i}><code>{msg}</code></li>
        ))}
      </ul>
    </details>
  )
}
