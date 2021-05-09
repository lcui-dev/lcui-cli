#include <wchar.h>

typedef struct Dict i18n_t;

extern i18n_t *i18n_create(const wchar_t *locale);

extern const wchar_t *i18n_get_text(i18n_t *i18n, const wchar_t *key);

extern void i18n_destroy(i18n_t *i18n);
