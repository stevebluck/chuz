import { useActionData, useNavigation } from "@remix-run/react";
import { Option } from "effect";
import { Route } from "web/Routes";
import { ValidationError } from "web/utils";

interface UseForm {
  error: Option.Option<ValidationError>;
  action: Route;
  isSubmitting: boolean;
}

export const useForm = (route: Route): UseForm => {
  const data = useActionData();
  const navigation = useNavigation();

  return {
    error: Option.fromNullable(data).pipe(Option.flatMap(ValidationError.parse)),
    action: route,
    isSubmitting: navigation.formAction === route,
  };
};
