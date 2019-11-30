#include <string.h>
#include "router.h"

{{config}}
router_t *router_create_with_config(const char *name, const char *config_name)
{
	router_t *router;

	router = router_create(name);
	if (!config_name) {
		config_name = "default";
	}
{{code}}
	return router;
}
