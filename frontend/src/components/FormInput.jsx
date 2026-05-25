export default function FormInput({
  label,
  name,
  value,
  onChange,
  type = 'text',
  placeholder,
  error,
  ...rest
}) {
  return (
    <div className="field">
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <input
        className={`input ${error ? 'inputError' : ''}`}
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        type={type}
        placeholder={placeholder}
        {...rest}
      />
      {error ? <div className="errorText">{error}</div> : null}
    </div>
  );
}
