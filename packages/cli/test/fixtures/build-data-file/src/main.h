#include <locale.h>
#include <LCUI.h>
#include <LCUI/main.h>
#include "greeting.h"

static void app_init(void)
{
        lcui_init();
        ui_load_greeting_resources();
        ui_register_greeting();
}

static int app_run(void)
{
        return lcui_run();
}
