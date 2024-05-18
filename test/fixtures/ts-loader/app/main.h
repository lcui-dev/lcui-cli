#include <locale.h>
#include <LCUI.h>
#include <LCUI/main.h>

#include "..\app.h"

static void lcui_app_init(void)
{
        setlocale(LC_CTYPE, "");
        lcui_init();
        ui_load_App_resources();
        ui_register_App();
}

static int lcui_app_run(void)
{
        return lcui_run();
}

