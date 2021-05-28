import {useState, useEffect} from 'react'

import {useLocalContext} from './useLocalContext'
import {useProxy} from './useProxy'
import {normalizeServerErrors, IErrors} from './errors'
import {handleEvent, isEmpty, replaceValues, stripEmptyValues, identity} from './utils'

interface IFormContext {
  values: object,
  onChange: Function,
}

interface IUseFormErrorsArgs {
  formContext: IFormContext,
  onError?: Function,
  validator?: object,
  noPositive?: boolean,
  name?: string,
}

export function useFormErrors(args: IUseFormErrorsArgs) {
  const {
    formContext,
    onError = identity,
    validator,
    noPositive,
    name,
  } = args
  const [errors, setErrors] = useState<IErrors>({})
  const [externalErrors, setExternalErrors] = useState<any>({})
  const [positive, setPositive] = useState({})
  const [touched, setTouched] = useState({})
  const [validating, setValidating] = useState({})
  const ctx: any = useLocalContext({errors, externalErrors, positive, touched, validating})

  const errorsProxy: IErrors = new Proxy(errors, {
    get(target, name: string) {
      if (name === '__form') {
        return target[name]
      }
      return touched[name] ? target[name] : undefined
    },
  })

  function updateExternalErrors(newErrors) {
    if (newErrors) {
      updateTouched(newErrors)
    }
    setExternalErrors(newErrors)
  }
  const updateExternalErrorsProxy = useProxy(
    updateExternalErrors,
    name => error => updateExternalErrors({[name]: error}),
  )

  function updateErrors(changedErrors = {}) {
    const newErrors = stripEmptyValues({...ctx.errors, ...changedErrors})
    setErrors(newErrors)
    onError(Object.keys(newErrors).length > 0 ? newErrors : null, formContext.values)
    setPositive(updatePositive(formContext.values, newErrors))
  }

  function updateValidating(changedValidating) {
    setValidating({...validating, ...changedValidating})
  }
  const updateValidatingProxy = useProxy(
    updateValidating,
    name => validating => updateValidating({[name]: validating}),
  )

  function validateValues(values) {
    updateErrors(updateValidationErrors(validator, values, ctx.externalErrors, updateTouched))
  }

  function updateTouched(changedTouched) {
    setTouched({...ctx.touched, ...replaceValues(changedTouched, true)})
    const untouchedExternalErrors = {...ctx.externalErrors}
    Object.entries(changedTouched).forEach(([key, touched]) => {
      if (touched) {
        delete untouchedExternalErrors[key]
      }
    })
    setExternalErrors(untouchedExternalErrors)
  }

  const handleBlurProxy = useProxy(
    {},
    name => () => {
      updateTouched({[name]: true})
      return validateValues(formContext.values)
    },
  )

  useEffect(() => {
    validateValues(formContext.values)
  }, [formContext.values, ctx.externalErrors])

  return {
    errors: errorsProxy,
    updateErrors: updateExternalErrorsProxy,
    validating: ctx.validating,
    updateValidating: updateValidatingProxy,
    touched: ctx.touched,
    positive: ctx.positive,
    handleBlur: handleBlurProxy,
    hasErrors: !!buildErrorList(errors),
    hasFieldErrors: !!buildErrorList(errors, true),
    anyValidating: Object.values(ctx.validating).some(x => !!x),
    validateValues,
    setErrors,
  }
}

function updatePositive(values, errors) {
  const newPositive = {}
  for (const [key, value] of Object.entries(values)) {
    newPositive[key] = !errors[key] && !isEmpty(value)
  }
  return newPositive
}

function updateValidationErrors(validator, values, externalErrors, onTouched) {
  let newErrors = {}
  if (validator) {
    newErrors = replaceValues(validator.fields, null)
    try {
      validator.validateSync(
        values,
        {
          abortEarly: false,
          context: {
            onTouched,
          }
        },
      )
    }
    catch (e) {
      if (e.name === 'ValidationError') {
        newErrors = e.inner.reduce((a, b) => {
          return {...a, [b.path]: b.message}
        }, newErrors)
      }
      else {
        throw e
      }
    }
  }
  return {
    ...newErrors,
    ...externalErrors,
  }
}

function buildErrorList(errors, skipFormErrors = false) {
  const errorList = []
  for (const [key, value] of Object.entries(errors)) {
    if (isEmpty(value)) {
      continue
    }
    if (key === '__form' && skipFormErrors) {
      continue
    }
    errorList.push(value)
  }
  return errorList.length ? errorList : null
}
