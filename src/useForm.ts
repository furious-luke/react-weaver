import {useState, useEffect} from 'react'

import {useFormErrors} from './useFormErrors'
import {useLocalContext} from './useLocalContext'
import {useProxy} from './useProxy'
import {normalizeServerErrors, IErrors} from './errors'
import {handleEvent, isEmpty, replaceValues, stripEmptyValues, identity} from './utils'

export interface IUseFormArgs {
  initialValues?: object,
  onSubmit?: Function,
  onChange?: Function,
  onError?: Function,
  validator?: object,
  noPositive?: boolean,
  name?: string,
}

export interface IFieldProps {
  id: string | number | symbol,
  name: string | number | symbol,
  value: any,
  onChange: Function,
  disabled: boolean,
  onBlur: Function,
  error?: IErrors | string,
  onError: Function,
  onValidating: Function,
  validating?: boolean,
  positive?: boolean,
}

/*
 * Create a new form instance.
 *
 * This simple hook uses JS proxies to prevent the need to know which
 * fields we might need ahead of time. The proxy for updating form
 * data values returns an updater function on-demand for the requested
 * property. It's prety neat.
 *
 * Usage looks something like this:
 *
 *   const initialValues = {first: 1, second: 2}
 *   const {fieldProps} = useForm({initialValues})
 *   return (
 *     <>
 *       <input {...fieldProps.first} />
 *       <input {...fieldProps.second} />
 *     </>
 *   )
 */
export function useForm(args: IUseFormArgs = {}) {
  const {
    initialValues = {},
    onSubmit,
    onChange,
    onError = identity,
    validator,
    noPositive,
    name,
  } = args
  const [values, setValues] = useState(initialValues)
  const [loading, setLoading] = useState(false)
  const ctx: any = useLocalContext({values, onChange})
  const {
    errors,
    updateErrors,
    validating,
    updateValidating,
    touched,
    positive,
    handleBlur,
    hasErrors,
    hasFieldErrors,
    anyValidating,
    setErrors,
  } = useFormErrors({formContext: ctx, onError, validator, name})

  const valuesProxy: any = new Proxy(values, {
    get(target, name) {
      return target[name] !== undefined ? target[name] : ''
    },
  })

  function updateValues(changedValues) {
    const newValues = {...ctx.values, ...changedValues}
    setValues(newValues)
    ctx.onChange?.(newValues)
  }
  const updateValuesProxy = useProxy(
    updateValues,
    name => handleEvent(value => updateValues({[name]: value})),
  )

  async function submit() {
    if (onSubmit) {
      setLoading(true)
      setErrors({})  // Clear any disconnected form errors
      try {
        await onSubmit(values)
      }
      catch (e) {
        updateErrors(normalizeServerErrors(e))
        throw e
      }
      finally {
        setLoading(false)
      }
    }
  }

  const fieldPropsProxy: any = new Proxy({}, {
    get(target, name: string) {
      const props: IFieldProps = {
        id: name,
        name,
        value: valuesProxy[name],
        onChange: updateValuesProxy[name],
        disabled: loading,
        onBlur: handleBlur[name],
        error: errors[name],
        onError: updateErrors[name],
        onValidating: updateValidating[name],
        validating: validating[name],
      }
      if (!noPositive) {
        props.positive = positive[name]
      }
      return props
    }
  })

  return {
    fieldProps: fieldPropsProxy,
    submit,
    values: valuesProxy,
    updateValues: updateValuesProxy,
    loading,
    errors,
    updateErrors,
    validating,
    updateValidating,
    touched,
    hasErrors,
    hasFieldErrors,
    anyValidating,
    notReady: hasErrors || anyValidating || loading,
  }
}
