#include <LCUI_Build.h>
#include <LCUI/util/dict.h>
#include "{{fileName}}.h"

#define I18N_CONFIG_LEN {{len}}

static wchar_t *i18n_config[I18N_CONFIG_LEN][{{maxItems}}] = {{content}};

static unsigned int i18n_key_hash(const void *key)
{
	const wchar_t *buf = key;
	unsigned int hash = 31415926;

	while (*buf) {
		hash = ((hash << 5) + hash) + (*buf++);
	}
	return hash;
}

static int i18n_key_compare(void *privdata, const void *key1, const void *key2)
{
	return wcscmp(key1, key2) == 0 ? 1 : 0;
}

static DictType i18n_dict_type = {
    i18n_key_hash,
    NULL,
    NULL,
    i18n_key_compare,
    NULL,
    NULL
};

i18n_t *i18n_create(const wchar_t *locale)
{
    int i;
    i18n_t *i18n;
    wchar_t **cursor;

    cursor = NULL;
    for (i = 0; i < I18N_CONFIG_LEN; ++i) {
        if (wcscmp(i18n_config[i][0], locale) == 0) {
            cursor = i18n_config[i] + 1;
            break;
        }
    }
    if (!cursor) {
        return NULL;
    }
    i18n = Dict_Create(&i18n_dict_type, NULL);
    while (*cursor) {
        Dict_Add(i18n, *cursor, *(cursor + 1));
        cursor += 2;
    }
    return i18n;
}

const wchar_t *i18n_get_text(i18n_t *i18n, const wchar_t *key)
{
    return Dict_FetchValue(i18n, key);
}

void i18n_destroy(i18n_t *i18n)
{
    Dict_Release(i18n);
}
